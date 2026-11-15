"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Map, Marker } from "maplibre-gl";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineFeedback } from "./inline-feedback";
import { importMapLibre } from "@/lib/features/locations/load-maplibre";
import { workspaceMapStyle } from "@/lib/features/locations/workspace-map-style";
import { normalizeCountryName } from "@/lib/features/locations/country-name";
import { createLatestRequest } from "@/lib/features/locations/latest-request";

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
  searchId?: string;
  validationId?: string;
};

export function LocationPicker({ value, onChange, searchId, validationId }: LocationPickerProps) {
  const id = useId();
  const inputId = searchId ?? `${id}-search`;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const searchTimer = useRef<number | undefined>(undefined);
  const [searchRequest] = useState(createLatestRequest);
  const [reverseRequest] = useState(createLatestRequest);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [reverseSearching, setReverseSearching] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  const { latitude, longitude } = value;
  const hasCoordinates = latitude !== null && longitude !== null;
  const shouldShowMap = mapExpanded;
  const selectedTitle = getSelectedTitle(value);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  useEffect(() => () => {
    window.clearTimeout(searchTimer.current);
    searchRequest.cancel();
    reverseRequest.cancel();
  }, [searchRequest, reverseRequest]);

  const updateLocation = useCallback((next: Partial<LocationValue>) => {
    const location = { ...valueRef.current, ...next };
    valueRef.current = location;
    onChangeRef.current(location);
  }, []);

  const stopSearch = useCallback(() => {
    window.clearTimeout(searchTimer.current);
    searchRequest.cancel();
    setSearching(false);
    setResults([]);
  }, [searchRequest]);

  const focusMap = () => {
    window.requestAnimationFrame(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      mapSectionRef.current?.focus({ preventScroll: true });
      resizeMap(mapRef.current);
    });
  };

  const openMapForPin = () => {
    setMapFailed(false);
    setMapExpanded(true);
    focusMap();
  };

  const toggleMap = () => {
    if (shouldShowMap) {
      setMapExpanded(false);
      document.getElementById(`${id}-map-toggle`)?.focus();
      return;
    }

    openMapForPin();
  };

  const reverseLookup = useCallback(async (latitude: number, longitude: number) => {
    stopSearch();
    setError(null);
    const request = reverseRequest.start();
    updateLocation({
      latitude,
      longitude,
      source: "pin",
      provider: "manual",
      providerId: null,
      confidence: null,
      raw: null,
    });
    const pinned = valueRef.current;

    try {
      setReverseSearching(true);
      const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`, { signal: request.signal });
      const data = await response.json();
      if (!request.isCurrent()) return;
      const current = valueRef.current;
      if (current.latitude !== latitude || current.longitude !== longitude || current.source !== "pin") return;
      if (!response.ok) throw new Error(data.error || "Address lookup failed.");
      if (!data.address) setError("Pin saved. Enter the address manually if it is missing.");
      updateLocation({
        address: current.address === pinned.address ? data.address || current.address : current.address,
        city: current.city === pinned.city ? data.city || current.city : current.city,
        country: current.country === pinned.country ? data.country || current.country : current.country,
        source: "pin",
        provider: data.provider || "manual",
        providerId: data.providerId || null,
        confidence: data.confidence ?? null,
        raw: data.raw ?? null,
      });
    } catch (error) {
      if (!request.isCurrent()) return;
      setError(error instanceof Error && error.message
        ? `Pin saved. ${error.message}`
        : "The pin was saved, but address lookup failed. You can edit the address manually.");
    } finally {
      if (request.finish()) setReverseSearching(false);
    }
  }, [reverseRequest, stopSearch, updateLocation]);

  const searchLocations = async (nextQuery = query) => {
    stopSearch();
    const trimmed = nextQuery.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setError("Type at least 3 characters to search.");
      return;
    }
    const request = searchRequest.start();
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
      const response = await fetch(`/api/geocode/search?${params.toString()}`, { signal: request.signal });
      const data = await response.json();
      if (!request.isCurrent()) return;
      setResults(data.results || []);
      if (data.error) setError(data.error);
      if (!data.error && (!data.results || data.results.length === 0)) {
        setError("No places found. Try a fuller address or use the map pin.");
      }
    } catch {
      if (!request.isCurrent()) return;
      setError("Location search failed. You can still place the pin manually.");
    } finally {
      if (request.finish()) setSearching(false);
    }
  };

  const chooseCandidate = (candidate: GeocodeCandidate) => {
    stopSearch();
    reverseRequest.cancel();
    setReverseSearching(false);
    setQuery(candidate.label);
    setMapExpanded(false);
    setError(null);
    updateLocation({
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
    requestAnimationFrame(() => document.getElementById(`${id}-map-toggle`)?.focus({ preventScroll: true }));
  };

  const clearSelection = () => {
    stopSearch();
    reverseRequest.cancel();
    setReverseSearching(false);
    setQuery("");
    setError(null);
    setMapExpanded(false);
    document.getElementById(inputId)?.focus();
    updateLocation({
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
    let loadTimer: number | undefined;
    async function setupMap() {
      if (!shouldShowMap || !mapContainerRef.current || mapRef.current) return;
      const maplibregl = await importMapLibre();
      if (cancelled || !mapContainerRef.current) return;

      const center: [number, number] =
        valueRef.current.latitude !== null && valueRef.current.longitude !== null
          ? [valueRef.current.longitude, valueRef.current.latitude]
          : [8.5417, 47.3769];

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: workspaceMapStyle,
        center,
        zoom: valueRef.current.latitude !== null && valueRef.current.longitude !== null ? 15 : 2,
      });
      mapRef.current = map;
      loadTimer = window.setTimeout(() => setMapFailed(true), 12000);
      map.once("load", () => {
        window.clearTimeout(loadTimer);
        setMapFailed(false);
        setMapReady(true);
      });
      map.on("click", async (event) => {
        await reverseLookup(event.lngLat.lat, event.lngLat.lng);
      });
    }

    void setupMap().catch(() => {
      if (!cancelled) setMapFailed(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    };
  }, [shouldShowMap, reverseLookup, mapAttempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || latitude === null || longitude === null) return;
    let cancelled = false;
    void importMapLibre().then(({ Marker }) => {
      if (cancelled || mapRef.current !== map) return;
      if (!markerRef.current) {
        const marker = new Marker({ draggable: true }).setLngLat([longitude, latitude]).addTo(map);
        marker.on("dragend", () => {
          const position = marker.getLngLat();
          void reverseLookup(position.lat, position.lng);
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLngLat([longitude, latitude]);
      }
      map.flyTo({ center: [longitude, latitude], zoom: 16 });
    });
    return () => { cancelled = true; };
  }, [mapReady, latitude, longitude, reverseLookup]);

  const changeQuery = (nextQuery: string) => {
    stopSearch();
    setQuery(nextQuery);
    setError(null);
    if (nextQuery.trim().length >= 3) {
      searchTimer.current = window.setTimeout(() => { void searchLocations(nextQuery); }, 350);
    }
  };

  const providerLabel = useMemo(() => getProviderLabel(value.provider), [value.provider]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={inputId}>Find the place</Label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              id={inputId}
              aria-invalid={Boolean(validationId)}
              aria-describedby={[validationId, error && `${id}-lookup-error`].filter(Boolean).join(" ") || undefined}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  searchLocations();
                }
              }}
              placeholder="Place name or full address"
              className="h-11"
            />
          </div>
          <Button type="button" variant="outline" size="icon" className="size-11 shrink-0"
            aria-label={searching ? "Searching locations" : "Search locations"} title="Search locations"
            onClick={() => searchLocations()} disabled={searching}>
            {searching ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          </Button>
        </div>

        {results.length > 0 && (
          <ul aria-label="Location results" className="max-h-64 divide-y divide-border/60 overflow-y-auto rounded-lg border bg-background">
            {results.map((candidate) => (
              <li key={candidate.id}><button
                type="button"
                onClick={() => chooseCandidate(candidate)}
                className="keyboard-focus block min-h-11 w-full px-3 py-2.5 text-left [overflow-wrap:anywhere] hover:bg-muted"
              >
                <span className="line-clamp-2 text-sm font-medium">{candidate.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {[candidate.city, candidate.country, getProviderLabel(candidate.provider)].filter(Boolean).join(" · ")}
                </span>
              </button></li>
            ))}
          </ul>
        )}

        {searching && <p role="status" className="sr-only">Searching locations…</p>}
        {error && <InlineFeedback id={`${id}-lookup-error`} error>{error}</InlineFeedback>}
        {!hasCoordinates && <Button id={`${id}-map-toggle`} type="button" variant="ghost" className="min-h-11"
          aria-expanded={shouldShowMap} aria-controls={shouldShowMap ? `${id}-map` : undefined}
          onClick={shouldShowMap ? toggleMap : openMapForPin}>
          <Crosshair aria-hidden="true" />{shouldShowMap ? "Hide map" : "Use map pin"}
        </Button>}
      </div>

      {hasCoordinates && (
        <div className="rounded-lg bg-muted px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="min-w-0 flex-1 space-y-1 [overflow-wrap:anywhere]" role="status">
              <p className="flex items-start gap-1.5 text-sm font-medium"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{selectedTitle}</span></p>
              <p className="text-xs text-muted-foreground">
                {[value.address !== selectedTitle ? value.address : "", [value.city, value.country].filter(Boolean).join(", "), providerLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button id={`${id}-map-toggle`} type="button" variant="outline" className="min-h-11" onClick={toggleMap}
                aria-expanded={shouldShowMap} aria-controls={shouldShowMap ? `${id}-map` : undefined}>
                {shouldShowMap ? "Hide map" : "Adjust pin"}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Clear location" title="Clear location" onClick={clearSelection}>
                <X aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {shouldShowMap && (
        <div ref={mapSectionRef} id={`${id}-map`} tabIndex={-1} className="scroll-mt-20 space-y-2">
          <p className="text-sm font-medium">Place the pin at the entrance</p>
          {reverseSearching && <p role="status" className="text-sm text-muted-foreground">Looking up the address…</p>}
          <div className="relative h-56 overflow-hidden rounded-lg bg-muted sm:h-80">
            <div ref={mapContainerRef} className="h-full w-full" />
            {!mapReady && !mapFailed && (
              <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center bg-background/70 text-sm text-muted-foreground">
                Loading map…
              </div>
            )}
          </div>
          {mapReady && <Button type="button" variant="outline" className="min-h-11" onClick={() => {
            const point = mapRef.current?.getCenter();
            if (point) void reverseLookup(point.lat, point.lng);
          }}><Crosshair aria-hidden="true" /> Use map centre</Button>}
          {mapFailed && <>
            <InlineFeedback error>The map could not load. You can still select a location from search.</InlineFeedback>
            <Button type="button" variant="outline" onClick={() => { setMapFailed(false); setMapAttempt((attempt) => attempt + 1); }}>Retry map</Button>
          </>}
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
  const normalized = normalizeCountryName(country).toLowerCase();
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
