import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InlineFeedback } from "@/components/shared/inline-feedback";
import { Star } from "lucide-react";

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting: boolean;
  maxCommentLength?: number;
  error?: string | null;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isSubmitting,
  maxCommentLength = 500,
  error,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const remainingChars = maxCommentLength - comment.length;

  const handleSubmit = async () => {
    const didSubmit = await onSubmit(rating, comment);
    if (!didSubmit) return;
    // Reset form after successful submission
    setRating(0);
    setComment("");
  };

  return (
    <div className="mb-5 rounded-lg bg-muted/50 p-3 sm:p-5">
      <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
      <div className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">Rating</legend>
          <div className="mt-1 flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                aria-pressed={star === rating}
                className="keyboard-focus grid size-11 place-items-center rounded-md hover:bg-muted"
                disabled={isSubmitting}
              >
                <Star
                  aria-hidden="true"
                  className={`size-6 ${
                    star <= rating
                      ? "fill-primary text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                />
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <Label htmlFor="review-comment">Your Review (Optional)</Label>
          <Textarea
            id="review-comment"
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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
        {error && <InlineFeedback error>{error}</InlineFeedback>}
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button className="min-h-11" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
