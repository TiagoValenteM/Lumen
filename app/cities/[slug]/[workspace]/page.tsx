"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkspaceImage } from "@/components/WorkspaceImage";
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
} from "lucide-react";

interface City {
  name: string;
  slug: string;
  country: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  short_description: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  
  // Productivity
  has_wifi: boolean;
  wifi_speed: string | null;
  has_power_outlets: boolean;
  power_outlet_availability: number | null;
  
  // Seating
  seating_capacity: number | null;
  seating_comfort: string | null;
  has_outdoor_seating: boolean;
  has_standing_desks: boolean;
  
  // Ambiance
  noise_level: string | null;
  has_natural_light: boolean;
  has_air_conditioning: boolean;
  has_heating: boolean;
  music_volume: number | null;
  
  // Amenities
  has_restrooms: boolean;
  has_parking: boolean;
  has_bike_parking: boolean;
  is_accessible: boolean;
  allows_pets: boolean;
  
  // Food & Beverage
  has_food: boolean;
  has_coffee: boolean;
  has_alcohol: boolean;
  price_range: number | null;
  
  // Policies
  laptop_friendly: boolean;
  time_limit_hours: number | null;
  minimum_purchase_required: boolean;
  
  // Community
  good_for_meetings: boolean;
  good_for_calls: boolean;
  
  // Ratings
  overall_rating: number | null;
  productivity_rating: number | null;
  comfort_rating: number | null;
  service_rating: number | null;
  total_reviews: number;
}

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
}

export default function WorkspacePage() {
  const params = useParams();
  const citySlug = params.slug as string;
  const workspaceSlug = params.workspace as string;
  
  const [city, setCity] = useState<City | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch city
      const { data: cityData } = await supabase
        .from('cities')
        .select('name, slug, country')
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
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [citySlug, workspaceSlug, supabase]);

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
            The workspace you're looking for doesn't exist.
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
  const priceSymbols = workspace.price_range ? '$'.repeat(workspace.price_range) : null;

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
              </CardContent>
            </Card>

            {/* Policies */}
            <Card>
              <CardHeader>
                <CardTitle>Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {workspace.time_limit_hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{workspace.time_limit_hours}h time limit</span>
                  </div>
                )}
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
              <Button className="w-full" size="lg">
                Save Workspace
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                Write a Review
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
