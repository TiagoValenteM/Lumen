"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { citiesData } from "@/data/cities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Wifi, Coffee, Users } from "lucide-react";

export default function CityPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Find the city in the data
  let cityInfo: { name: string; country: string } | null = null;
  
  for (const country of citiesData) {
    const city = country.cities.find((c) => c.slug === slug);
    if (city) {
      cityInfo = { name: city.name, country: country.name };
      break;
    }
  }

  if (!cityInfo) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">City Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The city you're looking for doesn't exist.
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

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/cities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cities
          </Link>
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            <span>{cityInfo.country}</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">{cityInfo.name}</h1>
          <p className="text-xl text-muted-foreground">
            Discover productive workspaces and digital nomad-friendly spots
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <Wifi className="h-8 w-8 mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Internet Speed</h3>
            <p className="text-2xl font-bold">Coming Soon</p>
            <p className="text-sm text-muted-foreground">Average Mbps</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <Coffee className="h-8 w-8 mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Cafés & Coworking</h3>
            <p className="text-2xl font-bold">Coming Soon</p>
            <p className="text-sm text-muted-foreground">Workspaces</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <Users className="h-8 w-8 mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Community</h3>
            <p className="text-2xl font-bold">Coming Soon</p>
            <p className="text-sm text-muted-foreground">Digital Nomads</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">About {cityInfo.name}</h2>
          <p className="text-muted-foreground mb-4">
            {cityInfo.name} is a vibrant city in {cityInfo.country}, popular among digital nomads and remote workers.
          </p>
          <p className="text-muted-foreground">
            More detailed information about workspaces, cost of living, and community will be added soon.
          </p>
        </div>
      </div>
    </div>
  );
}
