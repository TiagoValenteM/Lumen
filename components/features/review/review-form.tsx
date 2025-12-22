import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  maxCommentLength?: number;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isSubmitting,
  maxCommentLength = 500,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const remainingChars = maxCommentLength - comment.length;

  const handleSubmit = async () => {
    await onSubmit(rating, comment);
    // Reset form after successful submission
    setRating(0);
    setComment("");
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
                onClick={() => setRating(star)}
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
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
