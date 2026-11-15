"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, Check, ChevronDown, ExternalLink, EyeOff, Loader2, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InlineFeedback } from "@/components/shared/inline-feedback";
import { ModerationStatus } from "../../../_components/moderation-status";
import { getAiStatusPresentation } from "../../_lib/status-presentation";
import type { AdminWorkspaceFormState, AiEnrichmentRow, AiFieldDecision, AiFieldEvidence, AiRunMode } from "../_lib/types";

type AiSuggestedFields = NonNullable<AiEnrichmentRow["suggested_fields"]>;
const suggestionFilters = ["all", "high", "needs_check", "rejected"] as const;
type SuggestionFilter = typeof suggestionFilters[number];

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
  const aiStatus = getAiStatusPresentation(latest?.status);
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
  const dialogOpener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [viewFilter, setViewFilter] = useState<SuggestionFilter>("all");
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

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const button = dialogOpener.current;
    (button?.isConnected && !button.disabled ? button : heading.current)?.focus();
  };

  return (
    <section id="ai-review" aria-labelledby="ai-review-title" className="scroll-mt-32 space-y-4 rounded-lg bg-card px-3 py-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 id="ai-review-title" tabIndex={-1} ref={heading} className="flex items-center gap-2 text-lg font-semibold">
            <Bot className="size-5 text-primary" aria-hidden="true" />
            AI review assist
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => onRun("full")} disabled={runDisabled}>
          {running || isRunPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
          {running || isRunPending ? "Running AI…" : latest ? "Run again" : "Run AI enrichment"}
        </Button>
        {latest && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="min-h-11" disabled={runDisabled}>Run options <ChevronDown aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["no_web", "text_only", "details_only"] as const).map((mode) => (
                <DropdownMenuItem key={mode} onSelect={() => onRun(mode)}>{formatRunMode(mode)}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
      </div>

      {runError && (
        <AiDiagnostics title="AI action failed." message={runError} />
      )}
      {stagedMessage && (
        <InlineFeedback>{stagedMessage}</InlineFeedback>
      )}

      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-border/60 py-2.5">
        <ModerationStatus label={running && !isRunPending ? "Starting" : aiStatus.label} tone={aiStatus.tone} busy={running || isRunPending} />
        <p className="min-w-0 text-sm text-muted-foreground">
          {running && !isRunPending ? "Starting a new run…" : isActionable ? `${suggestions.length} ${suggestions.length === 1 ? "suggestion" : "suggestions"}` : aiStatus.detail}
        </p>
      </div>
      {latest && (
        <div className="space-y-4">
          {latest.error_message && latest.error_message !== runError && (
            <AiDiagnostics title="Provider diagnostics" message={latest.error_message} />
          )}

          {isActionable && fields && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-sm font-medium tabular-nums" role="status">{selectedVisibleCount} selected</span>
                <Button type="button" className="min-h-11" disabled={reviewBusy || selectedVisibleCount === 0} onClick={(event) => {
                  dialogOpener.current = event.currentTarget;
                  setApplyDialogOpen(true);
                }}>
                  <Check aria-hidden="true" />
                  Apply
                </Button>
                <Button type="button" variant="outline" className="min-h-11" disabled={reviewBusy || selectedVisibleCount === 0} onClick={(event) => {
                  dialogOpener.current = event.currentTarget;
                  setRejectDialogOpen(true);
                }}>
                  <EyeOff aria-hidden="true" />
                  Hide
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" aria-label="Discard AI run" title="Discard AI run"
                  disabled={reviewBusy || stagedPaths.length > 0} onClick={(event) => {
                    dialogOpener.current = event.currentTarget;
                    setDiscardDialogOpen(true);
                  }}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                <Select value={viewFilter} onValueChange={(value) => setViewFilter(value as SuggestionFilter)}>
                  <SelectTrigger aria-label="Filter suggestions" className="min-h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {suggestionFilters.map((filter) => <SelectItem key={filter} value={filter}>{formatFilterLabel(filter)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {visibleSuggestions.length > 0 && <>
                  <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={selectAllVisible} disabled={!selectablePaths.length || reviewBusy}>
                    Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={clearSelection} disabled={!selectedVisibleCount || reviewBusy}>
                    Clear
                  </Button>
                </>}
              </div>
              {visibleSuggestions.length > 0 ? (
                  <div className="divide-y divide-border/60 border-y border-border/60">
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
              ) : (
                <p className="rounded-md border bg-background/70 p-3 text-sm text-muted-foreground">
                  No visible AI suggestions remain for this run.
                </p>
              )}

              {unknownFields.length > 0 && (
                <details className="rounded-lg bg-muted/50 px-3 pb-2">
                  <summary className="keyboard-focus flex min-h-11 cursor-pointer items-center rounded-sm text-sm font-medium">Needs human check ({unknownFields.length})</summary>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI did not find reliable evidence for: {unknownFields.map(formatFieldLabel).join(", ")}.
                  </p>
                </details>
              )}
            </div>
          )}

          <details className="border-t border-border/60">
            <summary className="keyboard-focus min-h-11 cursor-pointer rounded-sm py-3 text-sm font-medium">Run details</summary>
            <p className="mb-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">{[latest.model, latest.run_mode && formatRunMode(latest.run_mode)].filter(Boolean).join(" · ") || "No model details recorded."}</p>
          {latest.citations && latest.citations.length > 0 && (
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
          )}
          </details>
        </div>
      )}

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent onCloseAutoFocus={restoreFocus}>
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
        <DialogContent onCloseAutoFocus={restoreFocus}>
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
        <DialogContent onCloseAutoFocus={restoreFocus}>
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
    </section>
  );
}

function AiDiagnostics({ title, message }: { title: string; message: string }) {
  return <InlineFeedback error>
    <span className="font-medium">{title}</span>
    <details className="mt-1">
      <summary className="keyboard-focus cursor-pointer rounded-sm underline underline-offset-2">Technical details</summary>
      <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{message}</p>
    </details>
  </InlineFeedback>;
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
    <div className="grid grid-cols-2 gap-3 py-3 [overflow-wrap:anywhere] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="col-span-2 flex min-w-0 items-start gap-3 lg:col-span-1">
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
      <details className="col-span-full min-w-0 text-xs text-muted-foreground lg:ml-7">
        <summary className="keyboard-focus cursor-pointer rounded-sm py-1 font-medium text-foreground">Evidence</summary>
        <p className="mt-1 break-words">{suggestion.evidence?.evidence || "No explanation provided."}</p>
        {suggestion.evidence?.source && (
          <a href={suggestion.evidence.source} target="_blank" rel="noreferrer" className="mt-1 block break-words text-primary hover:underline">
            {suggestion.evidence.source}
          </a>
        )}
        {!suggestion.evidence?.source && suggestion.sources.length > 0 && (
          <p className="mt-1 break-words">Sources: {suggestion.sources.join(", ")}</p>
        )}
      </details>
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

function formatFilterLabel(value: SuggestionFilter) {
  if (value === "high") return "High confidence";
  if (value === "needs_check") return "Needs check";
  if (value === "rejected") return "Hidden";
  return "All suggestions";
}
