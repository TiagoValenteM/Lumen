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
        {!showReviewForm && (
          <Button variant="outline" size="sm" onClick={onWriteReview}>
            Write review
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showReviewForm && userSignedIn && (
          <ReviewForm
            onSubmit={onSubmitReview}
            onCancel={onCancelReview}
            isSubmitting={submittingReview}
            maxCommentLength={maxCommentLength}
          />
        )}

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to share your experience at {workspaceName}</p>
            <Button onClick={onWriteReview}>Write the First Review</Button>
          </div>
        ) : (
          <ReviewsList reviews={reviews} profilesById={profilesById} />
        )}
      </CardContent>
    </Card>
  );
}
