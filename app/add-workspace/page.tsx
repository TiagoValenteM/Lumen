"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string;
}

interface FormData {
  // Basic Info
  name: string;
  type: string;
  city_id: string;
  address: string;
  website: string;
  phone: string;
  description: string;
  short_description: string;
  
  // Productivity
  has_wifi: boolean;
  wifi_speed: string;
  has_power_outlets: boolean;
  power_outlet_availability: number;
  
  // Seating
  seating_capacity: number;
  seating_comfort: string;
  has_outdoor_seating: boolean;
  has_standing_desks: boolean;
  
  // Ambiance
  noise_level: string;
  has_natural_light: boolean;
  has_air_conditioning: boolean;
  has_heating: boolean;
  music_volume: number;
  
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
  price_range: number;
  
  // Policies
  laptop_friendly: boolean;
  time_limit_hours: number;
  minimum_purchase_required: boolean;
  good_for_meetings: boolean;
  good_for_calls: boolean;
}

export default function AddWorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [cities, setCities] = useState<City[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "cafe",
    city_id: "",
    address: "",
    website: "",
    phone: "",
    description: "",
    short_description: "",
    has_wifi: true,
    wifi_speed: "moderate",
    has_power_outlets: true,
    power_outlet_availability: 3,
    seating_capacity: 20,
    seating_comfort: "comfortable",
    has_outdoor_seating: false,
    has_standing_desks: false,
    noise_level: "moderate",
    has_natural_light: true,
    has_air_conditioning: true,
    has_heating: true,
    music_volume: 3,
    has_restrooms: true,
    has_parking: false,
    has_bike_parking: false,
    is_accessible: true,
    allows_pets: false,
    has_food: true,
    has_coffee: true,
    has_alcohol: false,
    price_range: 2,
    laptop_friendly: true,
    time_limit_hours: 0,
    minimum_purchase_required: true,
    good_for_meetings: true,
    good_for_calls: false,
  });

  useEffect(() => {
    async function fetchCities() {
      const { data } = await supabase
        .from('cities')
        .select('id, name, slug, country')
        .order('name');
      
      if (data) setCities(data);
    }
    fetchCities();
  }, [supabase]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/add-workspace');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async () => {
    if (!user) return;
    if (uploadedPhotos.length === 0) {
      alert("Please upload at least one photo before submitting.");
      return;
    }
    
    setSubmitting(true);
    try {
      // Create slug from name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Insert workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          ...formData,
          slug,
          submitted_by: user.id,
          status: 'approved',
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Insert photos and wait for completion
      if (uploadedPhotos.length > 0 && workspace) {
        const photoInserts = uploadedPhotos.map((url, index) => ({
          workspace_id: workspace.id,
          user_id: user.id,
          url,
          is_primary: index === 0,
          is_approved: true,
        }));

        const { data: insertedPhotos, error: photosError } = await supabase
          .from('workspace_photos')
          .insert(photoInserts)
          .select();

        if (photosError) {
          console.error('Photo insert error:', photosError);
          throw photosError;
        }

        console.log('Photos inserted successfully:', insertedPhotos);
      }

      // Update city workspace count
      const { error: countError } = await supabase.rpc('increment', {
        table_name: 'cities',
        row_id: formData.city_id,
        column_name: 'workspace_count'
      });

      // If RPC doesn't exist, manually update the count
      if (countError) {
        const { data: currentCity } = await supabase
          .from('cities')
          .select('workspace_count')
          .eq('id', formData.city_id)
          .single();

        if (currentCity) {
          await supabase
            .from('cities')
            .update({ workspace_count: (currentCity.workspace_count || 0) + 1 })
            .eq('id', formData.city_id);
        }
      }

      // Small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to the new workspace page
      const citySlug = cities.find(c => c.id === formData.city_id)?.slug;
      router.push(`/cities/${citySlug}/${slug}`);
    } catch (error: any) {
      console.error('Error submitting workspace:', error);
      alert('Failed to submit workspace. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const totalSteps = 5;

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        // Basic Information - name, type, and city are required
        return !!(formData.name.trim() && formData.type && formData.city_id);
      case 2:
        // Productivity Features - all optional but if wifi is checked, speed should be selected
        if (formData.has_wifi && !formData.wifi_speed) return false;
        if (formData.has_power_outlets && !formData.power_outlet_availability) return false;
        return true;
      case 3:
        // Ambiance & Amenities - all optional
        return true;
      case 4:
        // Food & Policies - all optional
        return true;
      case 5:
        // Photos - require at least one photo uploaded
        return uploadedPhotos.length > 0;
      default:
        return true;
    }
  };

  const canProceedToNext = isStepValid(currentStep);

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Add a Workspace</h1>
          <p className="text-muted-foreground">
            Share a great cafe or coworking space with the community
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step < currentStep ? 'bg-primary border-primary text-primary-foreground' :
                step === currentStep ? 'border-primary text-primary' :
                'border-muted text-muted-foreground'
              }`}>
                {step < currentStep ? <Check className="h-5 w-5" /> : step}
              </div>
              {step < totalSteps && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us about the workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Café Malea"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => updateField('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cafe">Café</SelectItem>
                    <SelectItem value="coworking">Coworking Space</SelectItem>
                    <SelectItem value="hotel_lobby">Hotel Lobby</SelectItem>
                    <SelectItem value="library">Library</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Select value={formData.city_id} onValueChange={(value) => updateField('city_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}, {city.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => updateField('short_description', e.target.value)}
                  placeholder="One-line summary (max 500 characters)"
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe the workspace, atmosphere, and what makes it special..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+351 123 456 789"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Productivity Features */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Productivity Features</CardTitle>
              <CardDescription>What makes this a good place to work?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_wifi"
                    checked={formData.has_wifi}
                    onCheckedChange={(checked) => updateField('has_wifi', checked)}
                  />
                  <Label htmlFor="has_wifi" className="font-normal">Has WiFi</Label>
                </div>

                {formData.has_wifi && (
                  <div className="space-y-2">
                    <Label htmlFor="wifi_speed">WiFi Speed</Label>
                    <Select value={formData.wifi_speed} onValueChange={(value) => updateField('wifi_speed', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                        <SelectItem value="very_fast">Very Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_power_outlets"
                    checked={formData.has_power_outlets}
                    onCheckedChange={(checked) => updateField('has_power_outlets', checked)}
                  />
                  <Label htmlFor="has_power_outlets" className="font-normal">Has Power Outlets</Label>
                </div>

                {formData.has_power_outlets && (
                  <div className="space-y-2">
                    <Label htmlFor="power_outlet_availability">Power Outlet Availability (1-5)</Label>
                    <Select 
                      value={formData.power_outlet_availability.toString()} 
                      onValueChange={(value) => updateField('power_outlet_availability', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Very Limited</SelectItem>
                        <SelectItem value="2">2 - Limited</SelectItem>
                        <SelectItem value="3">3 - Moderate</SelectItem>
                        <SelectItem value="4">4 - Good</SelectItem>
                        <SelectItem value="5">5 - Excellent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seating_capacity">Seating Capacity (approximate)</Label>
                <Input
                  id="seating_capacity"
                  type="number"
                  value={formData.seating_capacity}
                  onChange={(e) => updateField('seating_capacity', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seating_comfort">Seating Comfort</Label>
                <Select value={formData.seating_comfort} onValueChange={(value) => updateField('seating_comfort', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncomfortable">Uncomfortable</SelectItem>
                    <SelectItem value="adequate">Adequate</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="very_comfortable">Very Comfortable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_outdoor_seating"
                  checked={formData.has_outdoor_seating}
                  onCheckedChange={(checked) => updateField('has_outdoor_seating', checked)}
                />
                <Label htmlFor="has_outdoor_seating" className="font-normal">Has Outdoor Seating</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_standing_desks"
                  checked={formData.has_standing_desks}
                  onCheckedChange={(checked) => updateField('has_standing_desks', checked)}
                />
                <Label htmlFor="has_standing_desks" className="font-normal">Has Standing Desks</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Ambiance & Amenities */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Ambiance & Amenities</CardTitle>
              <CardDescription>What's the atmosphere like?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="noise_level">Noise Level</Label>
                <Select value={formData.noise_level} onValueChange={(value) => updateField('noise_level', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiet">Quiet</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="loud">Loud</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="music_volume">Music Volume (1-5)</Label>
                <Select 
                  value={formData.music_volume.toString()} 
                  onValueChange={(value) => updateField('music_volume', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Silent</SelectItem>
                    <SelectItem value="2">2 - Quiet</SelectItem>
                    <SelectItem value="3">3 - Moderate</SelectItem>
                    <SelectItem value="4">4 - Loud</SelectItem>
                    <SelectItem value="5">5 - Very Loud</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_natural_light"
                    checked={formData.has_natural_light}
                    onCheckedChange={(checked) => updateField('has_natural_light', checked)}
                  />
                  <Label htmlFor="has_natural_light" className="font-normal">Natural Light</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_air_conditioning"
                    checked={formData.has_air_conditioning}
                    onCheckedChange={(checked) => updateField('has_air_conditioning', checked)}
                  />
                  <Label htmlFor="has_air_conditioning" className="font-normal">Air Conditioning</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_heating"
                    checked={formData.has_heating}
                    onCheckedChange={(checked) => updateField('has_heating', checked)}
                  />
                  <Label htmlFor="has_heating" className="font-normal">Heating</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_restrooms"
                    checked={formData.has_restrooms}
                    onCheckedChange={(checked) => updateField('has_restrooms', checked)}
                  />
                  <Label htmlFor="has_restrooms" className="font-normal">Restrooms</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_parking"
                    checked={formData.has_parking}
                    onCheckedChange={(checked) => updateField('has_parking', checked)}
                  />
                  <Label htmlFor="has_parking" className="font-normal">Parking</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_bike_parking"
                    checked={formData.has_bike_parking}
                    onCheckedChange={(checked) => updateField('has_bike_parking', checked)}
                  />
                  <Label htmlFor="has_bike_parking" className="font-normal">Bike Parking</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_accessible"
                    checked={formData.is_accessible}
                    onCheckedChange={(checked) => updateField('is_accessible', checked)}
                  />
                  <Label htmlFor="is_accessible" className="font-normal">Wheelchair Accessible</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allows_pets"
                    checked={formData.allows_pets}
                    onCheckedChange={(checked) => updateField('allows_pets', checked)}
                  />
                  <Label htmlFor="allows_pets" className="font-normal">Pet Friendly</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Food, Beverage & Policies */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Food, Beverage & Policies</CardTitle>
              <CardDescription>What's available and what are the rules?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_coffee"
                    checked={formData.has_coffee}
                    onCheckedChange={(checked) => updateField('has_coffee', checked)}
                  />
                  <Label htmlFor="has_coffee" className="font-normal">Serves Coffee</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_food"
                    checked={formData.has_food}
                    onCheckedChange={(checked) => updateField('has_food', checked)}
                  />
                  <Label htmlFor="has_food" className="font-normal">Serves Food</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_alcohol"
                    checked={formData.has_alcohol}
                    onCheckedChange={(checked) => updateField('has_alcohol', checked)}
                  />
                  <Label htmlFor="has_alcohol" className="font-normal">Serves Alcohol</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_range">Price Range</Label>
                <Select 
                  value={formData.price_range.toString()} 
                  onValueChange={(value) => updateField('price_range', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">$ - Budget</SelectItem>
                    <SelectItem value="2">$$ - Moderate</SelectItem>
                    <SelectItem value="3">$$$ - Expensive</SelectItem>
                    <SelectItem value="4">$$$$ - Very Expensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Policies</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="laptop_friendly"
                      checked={formData.laptop_friendly}
                      onCheckedChange={(checked) => updateField('laptop_friendly', checked)}
                    />
                    <Label htmlFor="laptop_friendly" className="font-normal">Laptop Friendly</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="minimum_purchase_required"
                      checked={formData.minimum_purchase_required}
                      onCheckedChange={(checked) => updateField('minimum_purchase_required', checked)}
                    />
                    <Label htmlFor="minimum_purchase_required" className="font-normal">Minimum Purchase Required</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time_limit_hours">Time Limit (hours, 0 for none)</Label>
                    <Input
                      id="time_limit_hours"
                      type="number"
                      value={formData.time_limit_hours}
                      onChange={(e) => updateField('time_limit_hours', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="good_for_meetings"
                      checked={formData.good_for_meetings}
                      onCheckedChange={(checked) => updateField('good_for_meetings', checked)}
                    />
                    <Label htmlFor="good_for_meetings" className="font-normal">Good for Meetings</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="good_for_calls"
                      checked={formData.good_for_calls}
                      onCheckedChange={(checked) => updateField('good_for_calls', checked)}
                    />
                    <Label htmlFor="good_for_calls" className="font-normal">Good for Phone Calls</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Photos */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>Add at least one photo of the workspace (max 2MB each)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                workspaceId="temp"
                onUploadComplete={(url) => setUploadedPhotos(prev => [...prev, url])}
                onUploadError={(error) => console.error(error)}
              />

              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {uploadedPhotos.map((url, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                      <img src={url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                      <button
                        onClick={() => setUploadedPhotos(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full hover:bg-destructive/90 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedPhotos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No photos uploaded yet. At least one photo is recommended.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Validation Message */}
        {!canProceedToNext && currentStep < totalSteps && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              {currentStep === 1 && "Please fill in all required fields: Workspace Name, Type, and City"}
              {currentStep === 2 && formData.has_wifi && !formData.wifi_speed && "Please select WiFi speed"}
              {currentStep === 2 && formData.has_power_outlets && !formData.power_outlet_availability && "Please select power outlet availability"}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || submitting}
            className="cursor-pointer"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
              disabled={submitting || !canProceedToNext}
              className="cursor-pointer"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !formData.name ||
                !formData.city_id ||
                uploadedPhotos.length === 0
              }
              className="cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submit Workspace
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
