"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, LocateFixed, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/lumen-page";
import { applyInterpretation, parseSpotSearch, SPOT_RADII, spotSearchHref, type SpotSearch } from "@/lib/features/find-a-spot/preferences";
import { distanceBetweenKm, hasSpotCoordinates, matchSpots } from "@/lib/features/find-a-spot/matching";
import { useSpotData } from "../_hooks/use-spot-data";
import { SpotRequest } from "./spot-request";
import { SpotFilters } from "./spot-filters";
import { SpotResults } from "./spot-results";

const selectStyle = "h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

export function FindSpot({ aiEnabled }: { aiEnabled: boolean }) {
  const { user } = useAuth();
  const params = useSearchParams();
  const search = useMemo(() => parseSpotSearch(params), [params]);
  const { city, cities, listing, retry } = useSpotData(search.city);
  const { latitude, longitude, loading: locating, error: locationError, requestLocation } = useGeolocation();
  const [useDistance, setUseDistance] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const located = useDistance && !locating && !locationError && latitude !== null && longitude !== null;
  const distances = useMemo(() => {
    if (!located || !listing) return null;
    return new Map(listing.places.filter(hasSpotCoordinates).map((place) => [place.id, distanceBetweenKm({ latitude, longitude }, place)]));
  }, [latitude, listing, located, longitude]);
  const results = useMemo(() => listing && matchSpots(listing.places, search, {
    now: listing.loadedAt,
    radiusKm: distances ? search.radiusKm ?? undefined : undefined,
    distanceKm: distances ? (place) => distances.get(place.id) ?? null : undefined,
  }), [distances, listing, search]);

  function updateSearch(patch: Partial<SpotSearch>) {
    const current = parseSpotSearch(new URLSearchParams(window.location.search));
    const href = spotSearchHref({ ...current, ...patch });
    if (href !== spotSearchHref(current)) window.history.pushState(null, "", href);
  }

  const relaxation = search.radiusKm ? { label: "Search the whole city", apply: () => updateSearch({ radiusKm: null }) }
    : search.minutes > 60 ? { label: "Try a 1-hour stay", apply: () => updateSearch({ minutes: 60 }) }
    : search.activity !== "general" ? { label: "Try general work", apply: () => updateSearch({ activity: "general" }) }
    : search.wifi ? { label: "Make Wi-Fi optional", apply: () => updateSearch({ wifi: false }) }
    : search.power ? { label: "Make outlets optional", apply: () => updateSearch({ power: false }) }
    : undefined;

  return (
    <main>
      <PageContainer>
        <header className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
          <div className="space-y-2">
            <Link href={city ? `/cities/${encodeURIComponent(city.slug)}` : "/cities"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> {city ? `Browse ${city.name}` : "Browse cities"}</Link>
            <h1 className="text-3xl font-semibold sm:text-4xl">Find a Spot</h1>
          </div>
          <label className="flex w-full min-w-0 flex-col gap-1.5 text-sm font-medium sm:w-56">
            City
            <select value={city?.slug ?? ""} className={selectStyle} disabled={!cities?.length} onChange={(event) => updateSearch({ city: event.target.value })}>
              <option value="" disabled>{cities === undefined ? "Loading cities…" : "Choose a city"}</option>
              {cities?.map((item) => <option key={item.id} value={item.slug}>{item.name}, {item.country}</option>)}
            </select>
          </label>
        </header>
        <div className="space-y-4">
          <SpotRequest canUseAi={aiEnabled && Boolean(user)} onInterpret={(result) => {
            const current = parseSpotSearch(new URLSearchParams(window.location.search));
            updateSearch(applyInterpretation(current, result));
          }} />
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-border/60 pt-4">
            <SpotFilters preferences={search} onChange={updateSearch} />
            {city && <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" aria-pressed={located} disabled={locating} onClick={() => {
                if (located) { setUseDistance(false); updateSearch({ radiusKm: null }); }
                else { setUseDistance(true); requestLocation(); }
              }}><LocateFixed aria-hidden="true" /> {locating ? "Locating…" : "Near me"}</Button>
              {located && <label className="sr-only" htmlFor="spot-radius">Search radius</label>}
              {located && <select id="spot-radius" className={selectStyle} value={search.radiusKm ?? ""} onChange={(event) => {
                updateSearch({ radiusKm: SPOT_RADII.find((value) => String(value) === event.target.value) ?? null });
              }}>
                <option value="">Whole city</option>
                {SPOT_RADII.map((radius) => <option key={radius} value={radius}>Within {radius} km</option>)}
              </select>}
            </div>}
          </div>
          {city && <div role="status" className="text-sm text-muted-foreground empty:sr-only">
            {locationError ? "Location unavailable. You can still search this city." : located ? "Distances are straight-line, not walking distances." : null}
            {!located && search.radiusKm !== null && <p>The {search.radiusKm} km limit needs your location. <button className="font-medium underline underline-offset-2" onClick={() => updateSearch({ radiusKm: null })}>Search the whole city</button></p>}
          </div>}
        </div>
        {cities === null || (city && listing === null) ? (
          <div role="status" className="space-y-2 border-t border-border/60 pt-5"><p className="text-sm">Couldn’t load {cities === null ? "cities" : "places"}.</p><Button variant="outline" size="sm" onClick={retry}>Try again</Button></div>
        ) : city && listing && results && (located || search.radiusKm === null) ? (
          <SpotResults scope={spotSearchHref(search)} {...results} limited={listing.limited} city={city.slug} now={listing.loadedAt} relaxation={relaxation}
            showMap={showMap} onToggleMap={() => setShowMap((visible) => !visible)} />
        ) : (
          <p role="status" className="flex items-center gap-2 border-t border-border/60 pt-5 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" aria-hidden="true" />
            {cities === undefined ? "Loading cities…" : cities.length === 0 ? "No cities have published places yet." : !city ? (search.city ? "That city isn’t available. Choose another city." : "Choose a city to see places.") : listing === undefined ? `Loading places in ${city.name}…` : "Share your location or search the whole city to see results."}
          </p>
        )}
      </PageContainer>
    </main>
  );
}
