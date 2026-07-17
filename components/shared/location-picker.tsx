"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map, Marker } from "maplibre-gl";
import { CheckCircle2, Crosshair, Loader2, Pencil, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  layers: [{ id: "carto", type: "raster", source: "carto" }],
} as const;

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const valueRef = useRef(value);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [reverseSearching, setReverseSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  const hasCoordinates = value.latitude !== null && value.longitude !== null;
  const shouldShowMap = !hasCoordinates || mapExpanded || manualMode;
  const selectedTitle = getSelectedTitle(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const updateLocation = (next: Partial<LocationValue>) => {
    onChange({ ...valueRef.current, ...next });
  };

  const focusMap = () => {
    window.requestAnimationFrame(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      resizeMap(mapRef.current);
    });
  };

  const openMapForPin = () => {
    setManualMode(true);
    setMapExpanded(true);
    focusMap();
  };

  const toggleMap = () => {
    if (shouldShowMap) {
      setManualMode(false);
      setMapExpanded(false);
      return;
    }

    setMapExpanded(true);
    focusMap();
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
      setReverseSearching(true);
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
      setError("The pin was saved, but address lookup failed. You can edit the address manually.");
    } finally {
      setReverseSearching(false);
    }
  };

  const setMarker = async (latitude: number, longitude: number, zoom = 16) => {
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
      setError("Type at least 3 characters to search.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: trimmed });
      const countryCode = getCountryCode(valueRef.current.country);
      if (countryCode) params.set("country", countryCode);
      if (valueRef.current.latitude !== null && valueRef.current.longitude !== null) {
        params.set("lat", String(valueRef.current.latitude));
        params.set("lng", String(valueRef.current.longitude));
      }
      const response = await fetch(`/api/geocode/search?${params.toString()}`);
      const data = await response.json();
      setResults(data.results || []);
      if (data.error) setError(data.error);
      if (!data.error && (!data.results || data.results.length === 0)) {
        setError("No places found. Try a fuller address or use the map pin.");
      }
    } catch {
      setError("Location search failed. You can still place the pin manually.");
    } finally {
      setSearching(false);
    }
  };

  const chooseCandidate = async (candidate: GeocodeCandidate) => {
    setQuery(candidate.label);
    setResults([]);
    setManualMode(false);
    setMapExpanded(true);
    setError(null);
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

  const clearSelection = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setManualMode(false);
    onChange({
      latitude: null,
      longitude: null,
      address: "",
      city: "",
      country: "",
      source: "manual",
      provider: null,
      providerId: null,
      confidence: null,
      raw: null,
    });
    markerRef.current?.remove();
    markerRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    async function setupMap() {
      if (!shouldShowMap || !mapContainerRef.current || mapRef.current) return;
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
        setManualMode(true);
        setMapExpanded(true);
        await reverseLookup(event.lngLat.lat, event.lngLat.lng);
      });
    }

    setupMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowMap]);

  useEffect(() => {
    if (!mapReady || value.latitude === null || value.longitude === null) return;
    setMarker(value.latitude, value.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, value.latitude, value.longitude]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (query.trim().length >= 3) searchLocations(query);
    }, 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const providerLabel = useMemo(() => getProviderLabel(value.provider), [value.provider]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/35 bg-card/80 p-3 shadow-sm shadow-black/5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Find the place</p>
            <p className="text-xs text-muted-foreground">Search first. Use the map only to confirm or correct the pin.</p>
          </div>
          {hasCoordinates && (
            <Badge variant="secondary" className="w-fit gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Location set
            </Badge>
          )}
        </div>

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
              placeholder="Search place name or full address"
              className="pl-9"
            />
          </div>
          <Button type="button" variant="outline" onClick={() => searchLocations()} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border bg-background">
            {results.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => chooseCandidate(candidate)}
                className="block w-full border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted/60"
              >
                <span className="line-clamp-2 text-sm font-medium">{candidate.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {[candidate.city, candidate.country, getProviderLabel(candidate.provider)].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          {error ? <p className="text-muted-foreground">{error}</p> : <p className="text-muted-foreground">Can’t find it? Place the pin manually.</p>}
          <Button type="button" variant="ghost" size="sm" className="w-fit gap-2" onClick={openMapForPin}>
            <Crosshair className="h-4 w-4" />
            Use map pin
          </Button>
        </div>
      </div>

      {hasCoordinates && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">Selected place</p>
                <Badge variant="outline" className="capitalize">{value.source}</Badge>
                {providerLabel && <Badge variant="secondary">{providerLabel}</Badge>}
              </div>
              <p className="break-words text-sm text-foreground">{selectedTitle}</p>
              <p className="break-words text-xs text-muted-foreground">
                {value.address || [value.city, value.country].filter(Boolean).join(", ") || "Address not found yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={toggleMap}>
                <Pencil className="mr-2 h-4 w-4" />
                {shouldShowMap ? "Hide map" : "Adjust pin"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {shouldShowMap && (
        <div ref={mapSectionRef} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Confirm on map</p>
            <p className="text-xs text-muted-foreground">
              {reverseSearching ? "Finding address..." : "Click or drag the pin to correct the exact entrance."}
            </p>
          </div>
          <div className="relative h-72 overflow-hidden rounded-xl border border-border/35 bg-muted sm:h-80">
            <div ref={mapContainerRef} className="h-full w-full" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Open data can be approximate. For Lumen, the pin should match the place entrance or building.
          </p>
        </div>
      )}
    </div>
  );
}

function getSelectedTitle(value: LocationValue) {
  const raw = value.raw as { properties?: { name?: unknown }; display_name?: unknown } | null;
  const rawName = raw?.properties?.name || raw?.display_name;
  if (typeof rawName === "string" && rawName.trim()) return rawName;
  if (value.address) return value.address;
  return [value.city, value.country].filter(Boolean).join(", ") || "Pinned location";
}

function resizeMap(map: Map | null) {
  (map as { resize?: () => void } | null)?.resize?.();
}

function getProviderLabel(provider: string | null) {
  if (!provider) return null;
  if (provider === "geoapify") return "Geoapify";
  if (provider === "locationiq") return "LocationIQ";
  if (provider === "photon") return "Photon";
  if (provider === "nominatim") return "OpenStreetMap";
  if (provider === "manual") return "Manual";
  return provider;
}

function getCountryCode(country: string) {
  const normalized = country.trim().toLowerCase();
  const countryCodes: Record<string, string> = {
    portugal: "pt",
    "united states": "us",
    usa: "us",
    "united states of america": "us",
    switzerland: "ch",
    spain: "es",
    france: "fr",
    germany: "de",
    italy: "it",
    denmark: "dk",
    netherlands: "nl",
    "united kingdom": "gb",
    uk: "gb",
  };
  if (/^[a-z]{2}$/.test(normalized)) return normalized;
  return countryCodes[normalized] || null;
}
