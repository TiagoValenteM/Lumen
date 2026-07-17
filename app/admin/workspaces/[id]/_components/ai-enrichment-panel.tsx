"use client";

import { useState } from "react";
import { Bot, ExternalLink, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { AiEnrichmentRow } from "../_lib/types";

type AiEnrichmentPanelProps = {
  enrichments: AiEnrichmentRow[];
  running: boolean;
  runError: string | null;
  onApplyCore: (fields: NonNullable<AiEnrichmentRow["suggested_fields"]>["core_details"]) => void;
  onApplyText: (fields: NonNullable<AiEnrichmentRow["suggested_fields"]>) => void;
  onApplyWorkDetails: (fields: Record<string, string | number | boolean | null>) => void;
  onApplyAll: (fields: NonNullable<AiEnrichmentRow["suggested_fields"]>) => void;
  onDiscard: (enrichmentId: string) => void;
  discarding: boolean;
  onRun: () => void;
  stagedMessage: string | null;
};

export function AiEnrichmentPanel({
  enrichments,
  running,
  runError,
  onApplyCore,
  onApplyText,
  onApplyWorkDetails,
  onApplyAll,
  onDiscard,
  discarding,
  onRun,
  stagedMessage,
}: AiEnrichmentPanelProps) {
  const latest = enrichments[0] ?? null;
  const isActionable = latest?.status === "completed" && Boolean(latest.suggested_fields);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const suggestedFieldCount = latest?.suggested_fields
    ? [
        latest.suggested_fields.core_details && Object.values(latest.suggested_fields.core_details).some(Boolean),
        latest.suggested_fields.short_description,
        latest.suggested_fields.description,
        latest.suggested_fields.website,
        latest.suggested_fields.phone,
        latest.suggested_fields.opening_hours_note,
        latest.suggested_fields.work_notes?.length,
        latest.suggested_fields.review_insights,
        latest.suggested_fields.work_details && Object.keys(latest.suggested_fields.work_details).length,
      ].filter(Boolean).length
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Label className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-primary" />
            AI review assist
          </Label>
          <p className="text-sm text-muted-foreground">
            Start here, apply useful suggestions, then verify and save the final place data.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRun} disabled={running}>
          <Wand2 className="mr-2 h-4 w-4" />
          {running ? "Running AI..." : latest ? "Run again" : "Run AI enrichment"}
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
          No AI enrichment has been recorded for this workspace yet. New submissions should create this automatically; use Run AI enrichment only for older places or failed setup.
        </p>
      ) : (
        <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={latest.status === "completed" ? "default" : latest.status === "failed" ? "destructive" : "secondary"}>
                {latest.status}
              </Badge>
              <Badge variant="outline">{latest.model}</Badge>
              {latest.status === "completed" && (
                <Badge variant="secondary">{suggestedFieldCount} suggestion groups</Badge>
              )}
            </div>
            {isActionable && latest.suggested_fields && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setApplyDialogOpen(true)}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Apply all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDiscardDialogOpen(true)}
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyText(latest.suggested_fields || {})}
                >
                  Apply text
                </Button>
              </div>
            )}
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

          {isActionable && latest.suggested_fields && (
            <div className="space-y-3 text-sm">
              {latest.suggested_fields.core_details && (
                <div className="rounded-md bg-muted/30 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Core details</p>
                      <p className="text-xs text-muted-foreground">Name, type, address, city, country, and exact coordinates when found.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => onApplyCore(latest.suggested_fields?.core_details || null)}>
                      Apply core
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(latest.suggested_fields.core_details).map(([key, value]) => (
                      value === null || value === undefined || value === "" ? null : (
                        <div key={key} className="rounded border bg-background px-2 py-1.5 text-xs">
                          <span className="font-medium">{key.replaceAll("_", " ")}</span>
                          <span className="ml-2 text-muted-foreground">{String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
                  {latest.field_sources?.core_details && latest.field_sources.core_details.length > 0 && (
                    <p className="mt-2 break-words text-xs text-muted-foreground">
                      Sources: {latest.field_sources.core_details.join(", ")}
                    </p>
                  )}
                </div>
              )}
              <AiField label="Short description" value={latest.suggested_fields.short_description} sources={latest.field_sources?.short_description} />
              <AiField label="Description" value={latest.suggested_fields.description} sources={latest.field_sources?.description} />
              <AiField label="Website" value={latest.suggested_fields.website} sources={latest.field_sources?.website} />
              <AiField label="Phone" value={latest.suggested_fields.phone} sources={latest.field_sources?.phone} />
              <AiField label="Opening hours note" value={latest.suggested_fields.opening_hours_note} sources={latest.field_sources?.opening_hours_note} />
              {latest.suggested_fields.work_notes && latest.suggested_fields.work_notes.length > 0 && (
                <div className="rounded-md bg-muted/30 p-3">
                  <p className="mb-1 font-medium">Work notes</p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {latest.suggested_fields.work_notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
              {latest.suggested_fields.review_insights && (
                <div className="rounded-md bg-muted/30 p-3">
                  <p className="mb-2 font-medium">Review insights</p>
                  {latest.suggested_fields.review_insights.summary && (
                    <p className="mb-2 text-muted-foreground">{latest.suggested_fields.review_insights.summary}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ReviewInsightList title="Positives" items={latest.suggested_fields.review_insights.positives} />
                    <ReviewInsightList title="Cautions" items={latest.suggested_fields.review_insights.cautions} />
                    <div className="rounded border bg-background p-2">
                      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Remote work signal</p>
                      <p className="text-xs text-muted-foreground">
                        {latest.suggested_fields.review_insights.remote_work_signal || "No clear remote-work signal found."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {latest.suggested_fields.work_details && Object.keys(latest.suggested_fields.work_details).length > 0 && (
                <div className="rounded-md bg-muted/30 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">Suggested work details</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => onApplyWorkDetails(latest.suggested_fields?.work_details || {})}>
                      Apply details
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(latest.suggested_fields.work_details).map(([key, value]) => (
                      <div key={key} className="rounded border bg-background px-2 py-1.5 text-xs">
                        <span className="font-medium">{key.replaceAll("_", " ")}</span>
                        <span className="ml-2 text-muted-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {latest.citations && latest.citations.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Sources</p>
              <div className="space-y-1">
                {latest.citations.slice(0, 6).map((citation) => (
                  <a
                    key={citation.url}
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 text-sm text-primary hover:underline"
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
            <DialogTitle>Apply all AI suggestions?</DialogTitle>
            <DialogDescription>
              This copies AI core details, text, review insights, and work details into the review form. It will not update admin preview or the public place until you click Save changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                if (latest?.suggested_fields) onApplyAll(latest.suggested_fields);
                setApplyDialogOpen(false);
              }}
            >
              Apply to form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard AI suggestions?</DialogTitle>
            <DialogDescription>
              This hides the current AI suggestion set from the review assist panel. You can run AI enrichment again later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={discarding}>Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={discarding}
              onClick={() => {
                if (latest) onDiscard(latest.id);
                setDiscardDialogOpen(false);
              }}
            >
              Discard suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewInsightList({ title, items }: { title: string; items?: string[] | null }) {
  return (
    <div className="rounded border bg-background p-2">
      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{title}</p>
      {items && items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No clear pattern found.</p>
      )}
    </div>
  );
}

function AiField({ label, value, sources }: { label: string; value?: string | null; sources?: string[] }) {
  if (!value) return null;

  return (
    <div className="rounded-md bg-muted/30 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <p className="font-medium">{label}</p>
        <Badge variant="secondary">AI suggested</Badge>
      </div>
      <p className="whitespace-pre-wrap break-words text-muted-foreground">{value}</p>
      {sources && sources.length > 0 && (
        <p className="mt-2 break-words text-xs text-muted-foreground">
          Sources: {sources.join(", ")}
        </p>
      )}
    </div>
  );
}
