"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAvatarUrl, getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useSavedWorkspace } from "@/hooks/useSavedWorkspace";
import { useVisitedWorkspace } from "@/hooks/useVisitedWorkspace";
import type { City, WorkspaceDetail, Photo, Review, ProfileSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/ui/toast";
import { WorkspaceImage, WorkspaceHeader } from "@/components/features/workspace";
import { ReviewForm, ReviewsList } from "@/components/features/review";
import {
  ArrowLeft,
  MapPin,
  Wifi,
  Zap,
  Coffee,
  Star,
  Clock,
  Phone,
  Globe,
  DollarSign,
  Users,
  Sprout,
  Volume2,
  Sun,
  Wind,
  Utensils,
  Car,
  Bike,
  Accessibility,
  PawPrint,
  Loader2,
  ChevronRight,
  MessageSquare,
  User,
  Bookmark,
  BookmarkCheck,
  MapPinCheck,
} from "lucide-react";

export default function WorkspacePage() {
  const params = useParams();
  const citySlug = params.slug as string;
  const workspaceSlug = params.workspace as string;
  const { user } = useAuth();
  
  const [city, setCity] = useState<City | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const { toast, showSuccess, showError } = useToast();
  const { isSaved, toggleSave } = useSavedWorkspace(user?.id, workspace?.id || "");
  const { hasVisited, toggleVisited } = useVisitedWorkspace(user?.id, workspace?.id || "");
  const MAX_COMMENT_LENGTH = 500;
  const supabase = createClient();

  const loadReviews = useCallback(async (workspaceId: string) => {
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, user_id, rating, comment, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError);
      return;
    }

    if (reviewsData) {
      setReviews(reviewsData);

      // Fetch profile summaries for unique user_ids
      const userIds = Array.from(new Set(reviewsData.map((r) => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url, email, tag")
          .in("id", userIds);

        if (profileError) {
          console.error("Error fetching profiles:", profileError);
        } else if (profileData) {
          const map: Record<string, ProfileSummary> = {};
          profileData.forEach((p) => {
            map[p.id] = {
              ...(p as ProfileSummary),
              avatar_url: resolveAvatarUrl((p as ProfileSummary).avatar_url),
            };
          });
          setProfilesById(map);
        }
      }
    }
  }, [supabase]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch city
      const { data: cityData } = await supabase
        .from('cities')
        .select('id, name, slug, country')
        .eq('slug', citySlug)
        .single();

      if (cityData) {
        setCity(cityData);

        // Fetch workspace
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('slug', workspaceSlug)
          .eq('city_id', (await supabase.from('cities').select('id').eq('slug', citySlug).single()).data?.id)
          .eq('status', 'approved')
          .single();

        if (workspaceData) {
          setWorkspace(workspaceData);

          // Fetch photos
          const { data: photosData } = await supabase
            .from('workspace_photos')
            .select('id, url, caption, is_primary')
            .eq('workspace_id', workspaceData.id)
            .eq('is_approved', true)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

          if (photosData) {
            setPhotos(photosData);
          }

          await loadReviews(workspaceData.id);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [citySlug, workspaceSlug, supabase]);

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!user || !workspace) return;
    if (rating === 0) {
      showError("Please select a rating");
      return;
    }
    if (comment.trim().length > MAX_COMMENT_LENGTH) {
      showError(`Comment is too long. Please keep it under ${MAX_COMMENT_LENGTH} characters.`);
      return;
    }

    setSubmittingReview(true);
    try {
      // Ensure profile exists to satisfy FK
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        },
        { onConflict: 'id' }
      );

      const { error } = await supabase
        .from('reviews')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      // Refresh reviews
      await loadReviews(workspace.id);
      setShowReviewForm(false);
      showSuccess("Review submitted successfully!");
    } catch (error: unknown) {
      console.error('Error submitting review:', error);
      const errorMessage = (error as Error)?.message || 'Failed to submit review';
      showError(`Error: ${errorMessage}. Please make sure the reviews table migration has been run in Supabase.`, 4000);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace || !city) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Workspace Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The workspace you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href="/cities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cities
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const primaryPhoto = photos.find(p => p.is_primary) || photos[0];
  const priceSymbols = workspace.price_range ? '$'.repeat(Number(workspace.price_range)) : null;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/cities" className="hover:text-foreground transition-colors">
            Cities
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/cities/${city.slug}`} className="hover:text-foreground transition-colors">
            {city.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{workspace.name}</span>
        </nav>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{workspace.name}</h1>
                <Badge className="capitalize">
                  {workspace.type.replace('_', ' ')}
                </Badge>
              </div>
              {workspace.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{workspace.address}</span>
                </div>
              )}
            </div>
            {priceSymbols && (
              <div className="flex items-center gap-1 text-2xl">
                {priceSymbols}
              </div>
            )}
          </div>

          {/* Ratings */}
          {workspace.overall_rating !== null && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-primary text-primary" />
                <span className="text-2xl font-bold">{workspace.overall_rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({workspace.total_reviews} {workspace.total_reviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>
              {workspace.productivity_rating && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Productivity: </span>
                  <span className="font-semibold">{workspace.productivity_rating.toFixed(1)}</span>
                </div>
              )}
              {workspace.comfort_rating && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Comfort: </span>
                  <span className="font-semibold">{workspace.comfort_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photos */}
            <div className="space-y-4">
              {primaryPhoto && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <WorkspaceImage
                    src={primaryPhoto.url}
                    alt={workspace.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
              {photos.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {photos.slice(1, 5).map((photo) => (
                    <div key={photo.id} className="relative aspect-video overflow-hidden rounded-lg">
                      <WorkspaceImage
                        src={photo.url}
                        alt={photo.caption || workspace.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {workspace.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {workspace.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Productivity Features */}
            <Card>
              <CardHeader>
                <CardTitle>Productivity</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Wifi className={`h-5 w-5 ${workspace.has_wifi ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">WiFi</p>
                    {workspace.wifi_speed && (
                      <p className="text-sm text-muted-foreground capitalize">{workspace.wifi_speed}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className={`h-5 w-5 ${workspace.has_power_outlets ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">Power Outlets</p>
                    {workspace.power_outlet_availability && (
                      <p className="text-sm text-muted-foreground">
                        {workspace.power_outlet_availability}/5 availability
                      </p>
                    )}
                  </div>
                </div>
                {workspace.seating_capacity && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Seating</p>
                      <p className="text-sm text-muted-foreground">{workspace.seating_capacity} seats</p>
                    </div>
                  </div>
                )}
                {workspace.noise_level && (
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Noise Level</p>
                      <p className="text-sm text-muted-foreground capitalize">{workspace.noise_level}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {workspace.has_coffee && (
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-primary" />
                      <span className="text-sm">Coffee</span>
                    </div>
                  )}
                  {workspace.has_food && (
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-primary" />
                      <span className="text-sm">Food</span>
                    </div>
                  )}
                  {workspace.has_veg && (
                    <div className="flex items-center gap-2">
                      <Sprout className="h-4 w-4 text-primary" />
                      <span className="text-sm">Vegetarian/Vegan options</span>
                    </div>
                  )}
                  {workspace.has_natural_light && (
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-primary" />
                      <span className="text-sm">Natural Light</span>
                    </div>
                  )}
                  {workspace.has_air_conditioning && (
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-primary" />
                      <span className="text-sm">A/C</span>
                    </div>
                  )}
                  {workspace.has_parking && (
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" />
                      <span className="text-sm">Parking</span>
                    </div>
                  )}
                  {workspace.has_bike_parking && (
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4 text-primary" />
                      <span className="text-sm">Bike Parking</span>
                    </div>
                  )}
                  {workspace.is_accessible && (
                    <div className="flex items-center gap-2">
                      <Accessibility className="h-4 w-4 text-primary" />
                      <span className="text-sm">Accessible</span>
                    </div>
                  )}
                  {workspace.allows_pets && (
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4 text-primary" />
                      <span className="text-sm">Pet Friendly</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workspace.website && (
                  <a
                    href={workspace.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">Visit Website</span>
                  </a>
                )}
                {workspace.phone && (
                  <a
                    href={`tel:${workspace.phone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{workspace.phone}</span>
                  </a>
                )}
                {(workspace.address || (workspace.latitude && workspace.longitude)) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      workspace.address
                        ? `${workspace.name}, ${workspace.address}`
                        : `${workspace.latitude},${workspace.longitude}`
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

            {/* Policies */}
            <Card>
              <CardHeader>
                <CardTitle>Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {workspace.time_limit_hours && workspace.time_limit_hours > 0 ? (
                    <span>
                      {workspace.time_limit_hours}{" "}
                      {workspace.time_limit_hours === 1 ? "hour" : "hours"} time limit
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

            {/* Quick Actions */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button 
                  variant={hasVisited ? "default" : "outline"}
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={async () => {
                    if (!user) {
                      showError("Please sign in to mark as visited");
                      return;
                    }
                    try {
                      await toggleVisited();
                      showSuccess(hasVisited ? "Removed from visited" : "Marked as been here!");
                    } catch (error) {
                      showError("Failed to update visited status");
                    }
                  }}
                >
                  <MapPinCheck className="h-5 w-5" />
                  {hasVisited ? "Been Here" : "Mark as Visited"}
                </Button>
                <Button 
                  variant={isSaved ? "default" : "outline"}
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={async () => {
                    if (!user) {
                      showError("Please sign in to save workspaces");
                      return;
                    }
                    try {
                      await toggleSave();
                      showSuccess(isSaved ? "Workspace removed from saved" : "Workspace saved!");
                    } catch (error) {
                      showError("Failed to save workspace");
                    }
                  }}
                >
                  {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  {isSaved ? "Saved" : "Save Place"}
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full gap-2"
                onClick={() => {
                  if (!user) {
                    showError("Please sign in to write a review");
                    return;
                  }
                  setShowReviewForm(!showReviewForm);
                }}
              >
                <MessageSquare className="h-5 w-5" />
                Write Review
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Reviews ({reviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Review Form */}
            {showReviewForm && user && (
              <ReviewForm
                onSubmit={handleSubmitReview}
                onCancel={() => setShowReviewForm(false)}
                isSubmitting={submittingReview}
                maxCommentLength={MAX_COMMENT_LENGTH}
              />
            )}

            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to share your experience at {workspace.name}
                </p>
                <Button
                  onClick={() => {
                    if (!user) {
                      showError("Please sign in to write a review");
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                >
                  Write the First Review
                </Button>
              </div>
            ) : (
              <ReviewsList reviews={reviews} profilesById={profilesById} />
            )}
          </CardContent>
        </Card>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
