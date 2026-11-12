"use client";

import { useMemo, useState } from "react";
import { Bot, Check, ExternalLink, EyeOff, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { AdminWorkspaceFormState, AiEnrichmentRow, AiFieldDecision, AiFieldEvidence, AiRunMode } from "../_lib/types";

type AiSuggestedFields = NonNullable<AiEnrichmentRow["suggested_fields"]>;

type AiSuggestionRow = {
  path: string;
  label: string;
  group: "Core" | "Text" | "Work details" | "Review";
  currentValue: string;
  suggestedValue: string;
  rawValue: string | number | boolean | null;
  evidence: AiFieldEvidence | null;
  sources: string[];
  decision: AiFieldDecision | null;
};

type AiEnrichmentPanelProps = {
  enrichments: AiEnrichmentRow[];
  currentValues: AdminWorkspaceFormState;
  running: boolean;
  runError: string | null;
  onApplySelected: (fields: AiSuggestedFields, fieldPaths: string[]) => void;
  onRejectSelected: (fieldPaths: string[]) => void;
  onDiscard: (enrichmentId: string) => void;
  discarding: boolean;
  onRun: (mode?: AiRunMode) => void;
  stagedMessage: string | null;
  stagedPaths: string[];
  reviewBusy: boolean;
};

export function AiEnrichmentPanel({
  enrichments,
  currentValues,
  running,
  runError,
  onApplySelected,
  onRejectSelected,
  onDiscard,
  discarding,
  onRun,
  stagedMessage,
  stagedPaths,
  reviewBusy,
}: AiEnrichmentPanelProps) {
  const latest = enrichments[0] ?? null;
  const latestId = latest?.id ?? null;
  const fields = latest?.suggested_fields;
  const isActionable = (latest?.status === "completed" || latest?.status === "ready_for_review") && Boolean(fields);
  const isRunPending = latest ? ["queued", "researching", "extracting", "pending"].includes(String(latest.status)) : false;
  const runDisabled = running || isRunPending || reviewBusy || stagedPaths.length > 0;
  const fieldEvidence = useMemo(
    () => fields?._field_evidence || latest?.field_evidence || {},
    [fields?._field_evidence, latest?.field_evidence],
  );
  const unknownFields = fields?._unknown_fields || latest?.unknown_fields || [];
  const fieldDecisions = useMemo(
    () => latest?.field_decisions || fields?._field_decisions || {},
    [fields?._field_decisions, latest?.field_decisions],
  );
  const suggestions = useMemo(
    () => (fields ? buildSuggestionRows(fields, fieldEvidence, latest?.field_sources || {}, currentValues, fieldDecisions) : []),
    [currentValues, fieldDecisions, fieldEvidence, fields, latest?.field_sources],
  );
  const defaultSelected = useMemo(
    () =>
      suggestions
        .filter((suggestion) => suggestion.rawValue !== null && suggestion.rawValue !== "")
        .filter((suggestion) => suggestion.currentValue !== suggestion.suggestedValue)
        .filter((suggestion) => suggestion.evidence?.confidence === "high")
        .filter((suggestion) => suggestion.decision !== "rejected" && suggestion.decision !== "applied")
        .map((suggestion) => suggestion.path),
    [suggestions],
  );
  const [selectedState, setSelectedState] = useState<{ runId: string | null; paths: string[] }>({
    runId: null,
    paths: [],
  });
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewFilter, setViewFilter] = useState<"all" | "high" | "needs_check" | "rejected">("all");
  const selectedPaths = selectedState.runId === latestId ? selectedState.paths : defaultSelected;
  const visibleSuggestions = suggestions
    .filter((suggestion) => (suggestion.decision === "rejected") === (viewFilter === "rejected"))
    .filter((suggestion) => {
      if (viewFilter === "high") return suggestion.evidence?.confidence === "high";
      if (viewFilter === "needs_check") return suggestion.evidence?.confidence !== "high" || suggestion.evidence?.basis === "conflicting";
      if (viewFilter === "rejected") return suggestion.decision === "rejected";
      return true;
    });
  const selectablePaths = visibleSuggestions
    .filter((suggestion) => !suggestion.decision && !stagedPaths.includes(suggestion.path))
    .map((suggestion) => suggestion.path);
  const selectedVisiblePaths = selectablePaths.filter((path) => selectedPaths.includes(path));
  const selectedVisibleCount = selectedVisiblePaths.length;
  const highConfidenceCount = suggestions.filter((suggestion) => suggestion.evidence?.confidence === "high").length;
  const reviewSignalCount = suggestions.filter((suggestion) => suggestion.evidence?.basis === "review_signal").length;

  const toggleSelected = (path: string) => {
    setSelectedState((current) => {
      const paths = current.runId === latestId ? current.paths : defaultSelected;
      return {
        runId: latestId,
        paths: paths.includes(path) ? paths.filter((selected) => selected !== path) : [...paths, path],
      };
    });
  };

  const selectAllVisible = () => {
    setSelectedState({ runId: latestId, paths: selectablePaths });
  };

  const clearSelection = () => {
    setSelectedState({ runId: latestId, paths: [] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Label className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-primary" />
            AI review assist
          </Label>
          <p className="text-sm text-muted-foreground">
            Compare suggestions with the current form, apply selected fields, then verify and save.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => onRun("full")} disabled={runDisabled}>
          <Wand2 className="mr-2 h-4 w-4" />
          {runDisabled ? "Running AI..." : latest ? "Run again" : "Run AI enrichment"}
        </Button>
      </div>

      {runError && (
        <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {runError}
        </p>
      )}
      {stagedMessage && (
        <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          {stagedMessage}
        </p>
      )}

      {!latest ? (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          No AI enrichment has been recorded for this workspace yet. New submissions should create this automatically.
        </p>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm">
          <div className="flex flex-col gap-3 rounded-lg border border-border/45 bg-background/45 p-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={latest.status === "completed" ? "default" : latest.status === "failed" ? "destructive" : "secondary"}>
                  {latest.status}
                </Badge>
                  {latest.run_mode && <Badge variant="outline">{formatRunMode(latest.run_mode)}</Badge>}
                  {(latest.status === "completed" || latest.status === "ready_for_review") && <Badge variant="secondary">{suggestions.length} suggestions</Badge>}
                {highConfidenceCount > 0 && <Badge variant="outline">{highConfidenceCount} high confidence</Badge>}
                {reviewSignalCount > 0 && <Badge variant="outline">{reviewSignalCount} review signals</Badge>}
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">{latest.model}</p>
            </div>

            {isActionable && fields && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="default" size="sm" className="h-8" disabled={reviewBusy || selectedVisibleCount === 0} onClick={() => setApplyDialogOpen(true)}>
                  <Check className="h-3.5 w-3.5" />
                  Apply
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8" disabled={reviewBusy || selectedVisibleCount === 0} onClick={() => setRejectDialogOpen(true)}>
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" disabled={reviewBusy || stagedPaths.length > 0} onClick={() => setDiscardDialogOpen(true)}>
                  Discard
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "high", "needs_check", "rejected"] as const).map((filter) => (
              <Button
                key={filter}
                type="button"
                variant={viewFilter === filter ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewFilter(filter)}
              >
                {formatFilterLabel(filter)}
              </Button>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            {(["full", "no_web", "text_only", "details_only"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={runDisabled}
                onClick={() => onRun(mode)}
              >
                {formatRunMode(mode)}
              </Button>
            ))}
          </div>

          {latest.error_message && (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {latest.error_message}
            </p>
          )}

          {(latest.status === "dismissed" || latest.status === "applied") && (
            <p className="rounded-md border bg-background/70 p-3 text-sm text-muted-foreground">
              {latest.status === "applied"
                ? "These AI suggestions were saved into the workspace. Run AI enrichment again for a fresh pass."
                : "These AI suggestions were discarded. Run AI enrichment again if you want a fresh pass."}
            </p>
          )}

          {isActionable && fields && (
            <>
              {visibleSuggestions.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border/60 bg-background/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <p className="text-sm font-medium">{selectedVisibleCount} selected</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={selectAllVisible} disabled={!selectablePaths.length || reviewBusy}>
                        Select all
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={!selectedVisibleCount || reviewBusy}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y divide-border/60">
                    {visibleSuggestions.map((suggestion) => (
                      <SuggestionRow
                        key={suggestion.path}
                        suggestion={suggestion}
                        checked={selectedVisiblePaths.includes(suggestion.path)}
                        staged={stagedPaths.includes(suggestion.path)}
                        disabled={reviewBusy || !selectablePaths.includes(suggestion.path)}
                        onCheckedChange={() => toggleSelected(suggestion.path)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-md border bg-background/70 p-3 text-sm text-muted-foreground">
                  No visible AI suggestions remain for this run.
                </p>
              )}

              {unknownFields.length > 0 && (
                <div className="rounded-md border border-border/60 bg-muted/25 p-3">
                  <p className="text-sm font-medium">Needs human check</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI did not find reliable evidence for: {unknownFields.map(formatFieldLabel).join(", ")}.
                  </p>
                </div>
              )}
            </>
          )}

          {latest.citations && latest.citations.length > 0 && (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Sources</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {latest.citations.slice(0, 8).map((citation) => (
                  <a
                    key={citation.url}
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-primary/5"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{citation.title || citation.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply selected AI suggestions?</DialogTitle>
            <DialogDescription>
              This copies {selectedVisibleCount} selected suggestion{selectedVisibleCount === 1 ? "" : "s"} into the review form. Preview and public view update after you save changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!fields || reviewBusy || selectedVisibleCount === 0}
              onClick={() => {
                if (fields) onApplySelected(fields, selectedVisiblePaths);
                setApplyDialogOpen(false);
              }}
            >
              Apply selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide selected suggestions?</DialogTitle>
            <DialogDescription>
              This hides the selected suggestions from the active AI review and saves that decision for other admins.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="secondary"
              disabled={reviewBusy || selectedVisibleCount === 0}
              onClick={() => {
                onRejectSelected(selectedVisiblePaths);
                setRejectDialogOpen(false);
              }}
            >
              Hide selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this AI run?</DialogTitle>
            <DialogDescription>
              This hides the full AI suggestion set from the review assist panel. You can run AI enrichment again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={discarding}>Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={discarding || reviewBusy || stagedPaths.length > 0}
              onClick={() => {
                if (latest) onDiscard(latest.id);
                setDiscardDialogOpen(false);
              }}
            >
              Discard run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  checked,
  staged,
  disabled,
  onCheckedChange,
}: {
  suggestion: AiSuggestionRow;
  checked: boolean;
  staged: boolean;
  disabled: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(180px,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(160px,0.8fr)] md:items-start">
      <div className="flex min-w-0 items-start gap-3">
        <Checkbox checked={checked || staged} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={`Select ${suggestion.label}`} />
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{suggestion.label}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="outline">{suggestion.group}</Badge>
            <ConfidenceBadge confidence={suggestion.evidence?.confidence} />
            <BasisBadge basis={suggestion.evidence?.basis} />
            <SourceQualityBadge sourceQuality={suggestion.evidence?.source_quality} />
            {suggestion.decision && <Badge variant="secondary">{suggestion.decision}</Badge>}
            {staged && <Badge variant="secondary">Staged</Badge>}
          </div>
        </div>
      </div>
      <ValueBlock label="Current" value={suggestion.currentValue} muted />
      <ValueBlock label="AI suggestion" value={suggestion.suggestedValue} />
      <div className="min-w-0 rounded-md bg-muted/25 p-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Evidence</p>
        <p className="mt-1 break-words">{suggestion.evidence?.evidence || "No explanation provided."}</p>
        {suggestion.evidence?.source && (
          <a href={suggestion.evidence.source} target="_blank" rel="noreferrer" className="mt-1 block break-words text-primary hover:underline">
            {suggestion.evidence.source}
          </a>
        )}
        {!suggestion.evidence?.source && suggestion.sources.length > 0 && (
          <p className="mt-1 break-words">Sources: {suggestion.sources.join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function ValueBlock({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={muted ? "mt-1 break-words text-sm text-muted-foreground" : "mt-1 break-words text-sm"}>
        {value}
      </p>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence?: AiFieldEvidence["confidence"] }) {
  if (!confidence) return <Badge variant="secondary">unscored</Badge>;
  if (confidence === "high") return <Badge variant="default">high</Badge>;
  if (confidence === "medium") return <Badge variant="secondary">medium</Badge>;
  return <Badge variant="outline">low</Badge>;
}

function BasisBadge({ basis }: { basis?: AiFieldEvidence["basis"] }) {
  if (!basis) return null;
  const label = basis.replaceAll("_", " ");
  return <Badge variant={basis === "conflicting" ? "destructive" : "outline"}>{label}</Badge>;
}

function SourceQualityBadge({ sourceQuality }: { sourceQuality?: AiFieldEvidence["source_quality"] }) {
  if (!sourceQuality) return null;
  return <Badge variant="outline">{sourceQuality.replaceAll("_", " ")}</Badge>;
}

function buildSuggestionRows(
  fields: AiSuggestedFields,
  evidence: Record<string, AiFieldEvidence>,
  fieldSources: Record<string, string[]> | null,
  currentValues: AdminWorkspaceFormState,
  fieldDecisions: Record<string, AiFieldDecision>,
) {
  const rows: AiSuggestionRow[] = [];

  addCoreRows(rows, fields, evidence, fieldSources, currentValues, fieldDecisions);
  addTextRows(rows, fields, evidence, fieldSources, currentValues, fieldDecisions);
  addReviewRows(rows, fields, evidence, fieldSources, fieldDecisions);
  addWorkDetailRows(rows, fields, evidence, fieldSources, currentValues, fieldDecisions);

  return rows.filter((row) => row.rawValue !== null && row.rawValue !== undefined && row.suggestedValue !== "");
}

function addCoreRows(
  rows: AiSuggestionRow[],
  fields: AiSuggestedFields,
  evidence: Record<string, AiFieldEvidence>,
  fieldSources: Record<string, string[]> | null,
  currentValues: AdminWorkspaceFormState,
  fieldDecisions: Record<string, AiFieldDecision>,
) {
  const core = fields.core_details;
  if (!core) return;
  const config: Array<[keyof NonNullable<AiSuggestedFields["core_details"]>, keyof AdminWorkspaceFormState, string]> = [
    ["name", "name", "Name"],
    ["type", "type", "Type"],
    ["address", "address", "Address"],
    ["city", "city_name", "City"],
    ["country", "country", "Country"],
    ["latitude", "latitude", "Latitude"],
    ["longitude", "longitude", "Longitude"],
  ];
  for (const [field, currentKey, label] of config) {
    const path = `core_details.${field}`;
    const rawValue = core[field] ?? null;
    rows.push({
      path,
      label,
      group: "Core",
      currentValue: formatValue(currentValues[currentKey] ?? null),
      suggestedValue: formatValue(rawValue),
      rawValue,
      evidence: evidence[path] || null,
      sources: getSources(fieldSources, path, "core_details"),
      decision: fieldDecisions[path] || null,
    });
  }
}

function addTextRows(
  rows: AiSuggestionRow[],
  fields: AiSuggestedFields,
  evidence: Record<string, AiFieldEvidence>,
  fieldSources: Record<string, string[]> | null,
  currentValues: AdminWorkspaceFormState,
  fieldDecisions: Record<string, AiFieldDecision>,
) {
  const config: Array<[keyof AiSuggestedFields, keyof AdminWorkspaceFormState, string]> = [
    ["short_description", "short_description", "Short description"],
    ["description", "description", "Description"],
    ["website", "website", "Website"],
    ["phone", "phone", "Phone"],
  ];
  for (const [field, currentKey, label] of config) {
    const rawValue = fields[field] as string | null | undefined;
    rows.push({
      path: field,
      label,
      group: "Text",
      currentValue: formatValue(currentValues[currentKey] ?? null),
      suggestedValue: formatValue(rawValue ?? null),
      rawValue: rawValue ?? null,
      evidence: evidence[field] || null,
      sources: getSources(fieldSources, field),
      decision: fieldDecisions[field] || null,
    });
  }
  if (fields.opening_hours_note) {
    rows.push({
      path: "opening_hours_note",
      label: "Opening hours note",
      group: "Text",
      currentValue: "Admin note only",
      suggestedValue: fields.opening_hours_note,
      rawValue: fields.opening_hours_note,
      evidence: evidence.opening_hours_note || null,
      sources: getSources(fieldSources, "opening_hours_note"),
      decision: fieldDecisions.opening_hours_note || null,
    });
  }
  for (const [index, note] of (fields.work_notes || []).entries()) {
    if (isWorkNoteMappedToDetails(note, fields.work_details || null)) continue;
    rows.push({
      path: `work_notes.${index}`,
      label: `Work note ${index + 1}`,
      group: "Text",
      currentValue: "Admin note / public description",
      suggestedValue: note,
      rawValue: note,
      evidence: evidence[`work_notes.${index}`] || evidence.work_notes || null,
      sources: getSources(fieldSources, `work_notes.${index}`, "work_notes"),
      decision: fieldDecisions[`work_notes.${index}`] || null,
    });
  }
}

function isWorkNoteMappedToDetails(note: string, details: Record<string, string | number | boolean | null> | null) {
  if (!details) return false;
  const text = note.toLowerCase();
  const mappedKeys = new Set<string>();
  if (/\bwifi\b|\bwi-fi\b|wireless internet/.test(text)) mappedKeys.add("has_wifi");
  if (/power outlet|outlets?|plug sockets?|charging/.test(text)) mappedKeys.add("has_power_outlets");
  if (/quiet|silent|reading room|study room/.test(text)) mappedKeys.add("noise_level");
  if (/laptop|study|work-friendly|work friendly|remote work|cowork/.test(text)) mappedKeys.add("laptop_friendly");
  if (/reading room|study room|seating|seats?|tables?|desk/.test(text)) mappedKeys.add("seating_comfort");
  if (/food|drink|beverage/.test(text)) mappedKeys.add("has_food");
  if (/coffee|espresso|cafe|café/.test(text)) mappedKeys.add("has_coffee");
  if (/outdoor|terrace|patio/.test(text)) mappedKeys.add("has_outdoor_seating");
  if (/meeting room|meetings?/.test(text)) mappedKeys.add("good_for_meetings");
  if (/call|phone booth|booth/.test(text)) mappedKeys.add("good_for_calls");
  if (/group|groups?/.test(text)) mappedKeys.add("good_for_groups");
  return Array.from(mappedKeys).some((key) => details[key] !== undefined && details[key] !== null);
}

function addReviewRows(
  rows: AiSuggestionRow[],
  fields: AiSuggestedFields,
  evidence: Record<string, AiFieldEvidence>,
  fieldSources: Record<string, string[]> | null,
  fieldDecisions: Record<string, AiFieldDecision>,
) {
  const review = fields.review_insights;
  if (!review) return;
  const reviewRows: Array<[string, string, string | null | undefined]> = [
    ["review_insights.summary", "Review summary", review.summary],
    ["review_insights.remote_work_signal", "Remote-work signal", review.remote_work_signal],
  ];
  for (const [path, label, value] of reviewRows) {
    rows.push({
      path,
      label,
      group: "Review",
      currentValue: "Admin note / public description",
      suggestedValue: formatValue(value ?? null),
      rawValue: value ?? null,
      evidence: evidence[path] || evidence.review_insights || null,
      sources: getSources(fieldSources, path, "review_insights"),
      decision: fieldDecisions[path] || null,
    });
  }
}

function addWorkDetailRows(
  rows: AiSuggestionRow[],
  fields: AiSuggestedFields,
  evidence: Record<string, AiFieldEvidence>,
  fieldSources: Record<string, string[]> | null,
  currentValues: AdminWorkspaceFormState,
  fieldDecisions: Record<string, AiFieldDecision>,
) {
  const details = fields.work_details;
  if (!details) return;
  for (const [key, rawValue] of Object.entries(details)) {
    const path = `work_details.${key}`;
    rows.push({
      path,
      label: formatFieldLabel(key),
      group: "Work details",
      currentValue: formatValue(currentValues[key as keyof AdminWorkspaceFormState] ?? null),
      suggestedValue: formatValue(rawValue),
      rawValue,
      evidence: evidence[path] || null,
      sources: getSources(fieldSources, path, key, "work_details"),
      decision: fieldDecisions[path] || null,
    });
  }
}

function getSources(fieldSources: Record<string, string[]> | null, ...keys: string[]) {
  if (!fieldSources) return [];
  for (const key of keys) {
    const sources = fieldSources[key];
    if (Array.isArray(sources) && sources.length > 0) return sources;
  }
  return [];
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Unknown";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).replaceAll("_", " ");
}

function formatFieldLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatRunMode(value: string) {
  if (value === "no_web") return "No web";
  if (value === "text_only") return "Text only";
  if (value === "details_only") return "Details only";
  return "Web research";
}

function formatFilterLabel(value: "all" | "high" | "needs_check" | "rejected") {
  if (value === "high") return "High confidence";
  if (value === "needs_check") return "Needs check";
  if (value === "rejected") return "Hidden";
  return "All suggestions";
}
