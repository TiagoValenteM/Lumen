"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadSpotCities, loadSpotPlaces, type SpotCity } from "@/lib/features/find-a-spot/spot-data";
import { readCitySessionHours, type SessionEvidence } from "@/lib/features/session-hours/repository";

type LoadResult<T> = { key: string; data: T | null };

export function useSpotData(slug: string, sessionActive: boolean) {
  const supabase = useMemo(() => createClient(), []);
  const [revision, setRevision] = useState(0);
  const [directory, setDirectory] = useState<LoadResult<SpotCity[]>>();
  const [listing, setListing] = useState<LoadResult<Awaited<ReturnType<typeof loadSpotPlaces>> & { loadedAt: number }>>();
  const [hours, setHours] = useState<LoadResult<Map<string, SessionEvidence>>>();
  const directoryKey = String(revision);
  const cities = directory?.key === directoryKey ? directory.data : undefined;
  const city = cities?.find((item) => item.slug === slug);
  const cityId = city?.id;
  const listingKey = `${revision}:${cityId ?? ""}`;

  useEffect(() => {
    const controller = new AbortController();
    loadSpotCities(supabase, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setDirectory({ key: directoryKey, data }); },
      () => { if (!controller.signal.aborted) setDirectory({ key: directoryKey, data: null }); },
    );
    return () => controller.abort();
  }, [directoryKey, supabase]);

  useEffect(() => {
    if (!cityId) return;
    const controller = new AbortController();
    loadSpotPlaces(supabase, cityId, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setListing({ key: listingKey, data: { ...data, loadedAt: Date.now() } }); },
      () => { if (!controller.signal.aborted) setListing({ key: listingKey, data: null }); },
    );
    return () => controller.abort();
  }, [cityId, listingKey, supabase]);

  useEffect(() => {
    if (!cityId || !sessionActive) return;
    let request: AbortController;
    const refresh = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      void readCitySessionHours(supabase, cityId, controller.signal).then(
        (data) => { if (!controller.signal.aborted) setHours({ key: listingKey, data }); },
        () => { if (!controller.signal.aborted) setHours({ key: listingKey, data: null }); },
      );
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      request.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [cityId, listingKey, sessionActive, supabase]);

  return { cities, city, listing: listing?.key === listingKey ? listing.data : undefined,
    hours: sessionActive && hours?.key === listingKey ? hours.data : undefined,
    retry: () => setRevision((current) => current + 1) };
}
