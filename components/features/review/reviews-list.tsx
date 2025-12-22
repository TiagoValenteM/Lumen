import { Star } from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { Review, ProfileSummary } from "@/lib/types";

interface ReviewsListProps {
  reviews: Review[];
  profilesById: Record<string, ProfileSummary>;
}

export function ReviewsList({ reviews, profilesById }: ReviewsListProps) {
  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const profile = profilesById[review.user_id];
        const tag =
          profile?.tag ||
          profile?.email?.split("@")[0] ||
          review.user_id?.slice(0, 6) ||
          "user";
        const initials = getInitials(tag);
        const avatarUrl = profile?.avatar_url;

        return (
          <div
            key={review.id}
            className="rounded-xl border border-border/60 bg-card/50 p-5 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
              {/* User Avatar */}
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={tag}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-primary/10 ring-2 ring-border flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{initials}</span>
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold tracking-tight">@{tag}</p>
                    <div className="inline-flex w-full sm:w-auto items-center justify-start sm:justify-start gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      <span className="text-[11px] uppercase tracking-wide">Rating</span>
                      <span className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-primary text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap sm:text-right">
                    {new Date(review.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm leading-relaxed text-foreground/90">{review.comment}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
