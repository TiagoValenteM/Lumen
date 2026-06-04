"use client";

import { useEffect, useRef, useState } from "react";
import type { Map, Marker } from "maplibre-gl";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LocationValue = {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  country: string;
  source: "search" | "pin" | "manual";
  provider: string | null;
  providerId: string | null;
  confidence: number | null;
  raw: unknown;
};

type GeocodeCandidate = {
  id: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  provider: string;
  providerId: string | null;
  confidence: number | null;
  raw: unknown;
};

type LocationPickerProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  workspaceName?: string;
};

const mapStyle = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-b.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-c.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-d.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
  },
  layers: [
    {
      id: "carto",
      type: "raster",
      source: "carto",
    },
  ],
} as const;

export function LocationPicker({ value, onChange, workspaceName }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const valueRef = useRef(value);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const updateLocation = (next: Partial<LocationValue>) => {
    onChange({
      ...valueRef.current,
      ...next,
    });
  };

  const reverseLookup = async (latitude: number, longitude: number) => {
    updateLocation({
      latitude,
      longitude,
      source: "pin",
      provider: "manual",
      providerId: null,
      confidence: null,
      raw: null,
    });

    try {
      const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
      const data = await response.json();
      updateLocation({
        latitude,
        longitude,
        address: data.address || valueRef.current.address,
        city: data.city || valueRef.current.city,
        country: data.country || valueRef.current.country,
        source: "pin",
        provider: data.provider || "manual",
        providerId: data.providerId || null,
        confidence: data.confidence ?? null,
        raw: data.raw ?? null,
      });
    } catch {
      // Manual pin placement still gives reliable coordinates.
    }
  };

  const setMarker = async (latitude: number, longitude: number, zoom = 15) => {
    const maplibregl = await import("maplibre-gl");
    const map = mapRef.current;
    if (!map) return;

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map);
      markerRef.current.on("dragend", async () => {
        const lngLat = markerRef.current?.getLngLat();
        if (!lngLat) return;
        await reverseLookup(lngLat.lat, lngLat.lng);
      });
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    map.flyTo({ center: [longitude, latitude], zoom, essential: true });
  };

  const searchLocations = async (nextQuery = query) => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      setResults(data.results || []);
      if (data.error) setError(data.error);
    } catch {
      setError("Location search failed. You can still place the pin manually.");
    } finally {
      setSearching(false);
    }
  };

  const chooseCandidate = async (candidate: GeocodeCandidate) => {
    setQuery(candidate.label);
    setResults([]);
    onChange({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      address: candidate.address,
      city: candidate.city,
      country: candidate.country,
      source: "search",
      provider: candidate.provider,
      providerId: candidate.providerId,
      confidence: candidate.confidence,
      raw: candidate.raw,
    });
    await setMarker(candidate.latitude, candidate.longitude);
  };

  useEffect(() => {
    let cancelled = false;
    async function setupMap() {
      if (!mapContainerRef.current || mapRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !mapContainerRef.current) return;

      const center: [number, number] =
        valueRef.current.latitude !== null && valueRef.current.longitude !== null
          ? [valueRef.current.longitude, valueRef.current.latitude]
          : [8.5417, 47.3769];

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center,
        zoom: valueRef.current.latitude !== null && valueRef.current.longitude !== null ? 15 : 2,
      });
      mapRef.current = map;
      map.on("load", () => setMapReady(true));
      map.on("click", async (event) => {
        await reverseLookup(event.lngLat.lat, event.lngLat.lng);
      });
    }

    setupMap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady || value.latitude === null || value.longitude === null) return;
    setMarker(value.latitude, value.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, value.latitude, value.longitude]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (query.trim().length >= 3) {
        searchLocations(query);
      }
    }, 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchLocations();
              }
            }}
            placeholder={workspaceName ? `${workspaceName}, city or address` : "Search city or full address"}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => searchLocations()} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-muted-foreground">{error}</p>}

      {results.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-md border bg-card">
          {results.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => chooseCandidate(candidate)}
              className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
            >
              <span className="font-medium">{candidate.label}</span>
              {(candidate.city || candidate.country) && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {[candidate.city, candidate.country].filter(Boolean).join(", ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="relative h-72 overflow-hidden rounded-lg border bg-muted">
        <div ref={mapContainerRef} className="h-full w-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {value.latitude !== null && value.longitude !== null
            ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
            : "Click the map or choose a result to set the pin"}
        </div>
        <div>
          {value.address || [value.city, value.country].filter(Boolean).join(", ") || "Address can be edited below"}
        </div>
      </div>
    </div>
  );
}
