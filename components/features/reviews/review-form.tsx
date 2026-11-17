import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting: boolean;
  maxCommentLength?: number;
  draftKey?: string;
}

function readDraft(key?: string) {
  const empty = { rating: 0, comment: "" };
  if (!key || typeof window === "undefined") return empty;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) ?? "null");
    if (!Number.isInteger(value?.rating) || value.rating < 0 || value.rating > 5 || typeof value.comment !== "string") return empty;
    return { rating: value.rating as number, comment: value.comment as string };
  } catch {
    return empty;
  }
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isSubmitting,
  maxCommentLength = 500,
  draftKey,
}: ReviewFormProps) {
  const [{ rating, comment }, setDraft] = useState(() => {
    const draft = readDraft(draftKey);
    return { ...draft, comment: draft.comment.slice(0, maxCommentLength) };
  });
  const remainingChars = maxCommentLength - comment.length;

  function updateDraft(nextRating: number, nextComment: string) {
    setDraft({ rating: nextRating, comment: nextComment });
    if (!draftKey) return;
    try {
      if (nextRating || nextComment) window.sessionStorage.setItem(draftKey, JSON.stringify({ rating: nextRating, comment: nextComment }));
      else window.sessionStorage.removeItem(draftKey);
    } catch {
      // The review still works when browser storage is unavailable.
    }
  }

  const handleSubmit = async () => {
    const didSubmit = await onSubmit(rating, comment);
    if (!didSubmit) return;
    updateDraft(0, "");
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
      <div className="space-y-4">
        <div>
          <Label>Rating</Label>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => updateDraft(star, comment)}
                aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                aria-pressed={rating === star}
                className="transition-transform hover:scale-110"
                disabled={isSubmitting}
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= rating
                      ? "fill-primary text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="review-comment">Your Review (Optional)</Label>
          <Textarea
            id="review-comment"
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => updateDraft(rating, e.target.value)}
            rows={4}
            className="mt-2"
            maxLength={maxCommentLength}
            disabled={isSubmitting}
          />
          <div
            className={`mt-1 text-xs ${
              remainingChars < 0 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {remainingChars < 0
              ? `Too long by ${Math.abs(remainingChars)} characters (max ${maxCommentLength})`
              : `${remainingChars} characters remaining (max ${maxCommentLength})`}
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button variant="outline" onClick={() => { updateDraft(0, ""); onCancel(); }} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
