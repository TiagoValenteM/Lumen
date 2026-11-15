"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EditSuggestionRow } from "../_lib/types";

type SuggestionsPanelProps = {
  suggestions: EditSuggestionRow[];
  savingSuggestionId: string | null;
  onUpdateStatus: (suggestionId: string, status: string) => void;
};

export function SuggestionsPanel({ suggestions, savingSuggestionId, onUpdateStatus }: SuggestionsPanelProps) {
  return (
    <section id="edit-suggestions" aria-labelledby="edit-suggestions-title" className="scroll-mt-32 space-y-2 border-t border-border/60 pt-4">
      <h2 id="edit-suggestions-title" className="text-lg font-semibold">Edit suggestions</h2>
      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No edit suggestions yet.
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="min-w-0 py-3">
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {suggestion.kind.replaceAll("_", " ")}
                  </Badge>
                  <Badge variant={suggestion.status === "open" ? "default" : "secondary"} className="capitalize">
                    {suggestion.status}
                  </Badge>
                </div>
                <Select
                  value={suggestion.status}
                  onValueChange={(value) => onUpdateStatus(suggestion.id, value)}
                  disabled={savingSuggestionId === suggestion.id}
                >
                  <SelectTrigger aria-label="Suggestion status" className="min-h-11 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">{suggestion.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
