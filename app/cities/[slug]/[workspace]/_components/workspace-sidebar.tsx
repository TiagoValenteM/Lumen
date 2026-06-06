"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceSuggestionKind } from "@/lib/features/workspace-suggestions/actions";
import type { WorkspaceDetail } from "@/lib/types";
import { Bookmark, BookmarkCheck, Clock, DollarSign, Globe, Loader2, MapPin, MapPinCheck, MessageSquare, Phone, Users } from "lucide-react";

type WorkspaceSidebarProps = {
  workspace: WorkspaceDetail;
  userSignedIn: boolean;
  hasVisited: boolean;
  isSaved: boolean;
  suggestionOpen: boolean;
  suggestionKind: WorkspaceSuggestionKind;
  suggestionMessage: string;
  suggestionError: string | null;
  submittingSuggestion: boolean;
  onToggleVisited: () => void;
  onToggleSaved: () => void;
  onWriteReview: () => void;
  onSuggestionOpenChange: (open: boolean) => void;
  onSuggestionKindChange: (kind: WorkspaceSuggestionKind) => void;
  onSuggestionMessageChange: (message: string) => void;
  onSubmitSuggestion: () => void;
};

export function WorkspaceSidebar({
  workspace,
  userSignedIn,
  hasVisited,
  isSaved,
  suggestionOpen,
  suggestionKind,
  suggestionMessage,
  suggestionError,
  submittingSuggestion,
  onToggleVisited,
  onToggleSaved,
  onWriteReview,
  onSuggestionOpenChange,
  onSuggestionKindChange,
  onSuggestionMessageChange,
  onSubmitSuggestion,
}: WorkspaceSidebarProps) {
  return (
    <div className="space-y-6 lg:sticky lg:top-20">
      <Card>
        <CardHeader>
          <CardTitle>Plan your visit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button variant={hasVisited ? "default" : "outline"} size="lg" className="flex-1 gap-2" onClick={onToggleVisited}>
              <MapPinCheck className="h-5 w-5" />
              {hasVisited ? "Been Here" : "Mark as Visited"}
            </Button>
            <Button variant={isSaved ? "default" : "outline"} size="lg" className="flex-1 gap-2" onClick={onToggleSaved}>
              {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
              {isSaved ? "Saved" : "Save Place"}
            </Button>
          </div>
          <Button variant="outline" size="lg" className="w-full gap-2" onClick={onWriteReview}>
            <MessageSquare className="h-5 w-5" />
            Write Review
          </Button>

          <Dialog open={suggestionOpen} onOpenChange={onSuggestionOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="w-full gap-2">
                <MapPin className="h-5 w-5" />
                Suggest an Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader className="min-w-0">
                <DialogTitle className="break-words">Suggest an edit</DialogTitle>
                <DialogDescription className="break-words">Send a correction for this place. Admins review suggestions before changing public data.</DialogDescription>
              </DialogHeader>
              <div className="min-w-0 space-y-4">
                <div className="space-y-2">
                  <Label>What should we check?</Label>
                  <Select value={suggestionKind} onValueChange={(value) => onSuggestionKindChange(value as WorkspaceSuggestionKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wrong_location">Wrong location</SelectItem>
                      <SelectItem value="closed_place">Closed place</SelectItem>
                      <SelectItem value="incorrect_amenities">Incorrect amenities</SelectItem>
                      <SelectItem value="bad_photo">Bad photo</SelectItem>
                      <SelectItem value="duplicate">Duplicate place</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Details</Label>
                  <Textarea
                    value={suggestionMessage}
                    onChange={(event) => onSuggestionMessageChange(event.target.value)}
                    placeholder="Tell us what looks wrong and what the correct information should be."
                    className="break-words [overflow-wrap:anywhere]"
                    aria-invalid={Boolean(suggestionError)}
                    rows={5}
                    maxLength={800}
                  />
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <p className="min-h-4 min-w-0 break-words text-destructive [overflow-wrap:anywhere]">
                      {suggestionError}
                    </p>
                    <span className="shrink-0 text-muted-foreground">
                      {suggestionMessage.trim().length}/800
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => onSuggestionOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={onSubmitSuggestion} disabled={submittingSuggestion || !userSignedIn}>
                  {submittingSuggestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send suggestion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <ContactCard workspace={workspace} />
      <PoliciesCard workspace={workspace} />
    </div>
  );
}

function ContactCard({ workspace }: { workspace: WorkspaceDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {workspace.website && (
          <a href={workspace.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
            <Globe className="h-4 w-4" />
            <span className="text-sm">Visit Website</span>
          </a>
        )}
        {workspace.phone && (
          <a href={`tel:${workspace.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Phone className="h-4 w-4" />
            <span className="text-sm">{workspace.phone}</span>
          </a>
        )}
        {(workspace.address || (workspace.latitude && workspace.longitude)) && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              workspace.address ? `${workspace.name}, ${workspace.address}` : `${workspace.latitude},${workspace.longitude}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Get directions</span>
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function PoliciesCard({ workspace }: { workspace: WorkspaceDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Policies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {workspace.time_limit_hours && workspace.time_limit_hours > 0 ? (
            <span>
              {workspace.time_limit_hours} {workspace.time_limit_hours === 1 ? "hour" : "hours"} time limit
            </span>
          ) : (
            <span className="text-foreground font-medium">No maximum time</span>
          )}
        </div>
        {workspace.minimum_purchase_required && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>Minimum purchase required</span>
          </div>
        )}
        {workspace.good_for_meetings && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>Good for meetings</span>
          </div>
        )}
        {workspace.good_for_calls && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span>Good for calls</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
