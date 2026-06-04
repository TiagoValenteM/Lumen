"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-2">
      <Label>Edit suggestions</Label>
      {suggestions.length === 0 ? (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          No public suggestions for this workspace.
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
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
                  <SelectTrigger className="h-8 w-[130px] text-xs">
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
              <p className="text-sm text-muted-foreground whitespace-pre-line">{suggestion.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
