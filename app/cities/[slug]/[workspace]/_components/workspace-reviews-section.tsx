"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewForm, ReviewsList } from "@/components/features/review";
import type { ProfileSummary, Review } from "@/lib/types";
import { MessageSquare } from "lucide-react";

type WorkspaceReviewsSectionProps = {
  workspaceName: string;
  reviews: Review[];
  profilesById: Record<string, ProfileSummary>;
  showReviewForm: boolean;
  userSignedIn: boolean;
  submittingReview: boolean;
  reviewError: string | null;
  maxCommentLength: number;
  onSubmitReview: (rating: number, comment: string) => Promise<boolean>;
  onCancelReview: () => void;
  onWriteReview: () => void;
};

export function WorkspaceReviewsSection({
  workspaceName,
  reviews,
  profilesById,
  showReviewForm,
  userSignedIn,
  submittingReview,
  reviewError,
  maxCommentLength,
  onSubmitReview,
  onCancelReview,
  onWriteReview,
}: WorkspaceReviewsSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Reviews ({reviews.length})
        </CardTitle>
        {!showReviewForm && reviews.length > 0 && (
          <Button variant="outline" size="sm" onClick={onWriteReview}>
            Write review
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showReviewForm && userSignedIn && (
          <div id="write-review" tabIndex={-1} aria-label="Write a review">
          <ReviewForm
            onSubmit={onSubmitReview}
            onCancel={onCancelReview}
            isSubmitting={submittingReview}
            error={reviewError}
            maxCommentLength={maxCommentLength}
          />
          </div>
        )}

        {reviews.length === 0 ? (
          !showReviewForm && <div className="space-y-3 py-2">
            <p className="break-words text-sm text-muted-foreground">No reviews for {workspaceName} yet.</p>
            <Button variant="outline" className="min-h-11" onClick={onWriteReview}>Write the first review</Button>
          </div>
        ) : (
          <ReviewsList reviews={reviews} profilesById={profilesById} />
        )}
      </CardContent>
    </Card>
  );
}
