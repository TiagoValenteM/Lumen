"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { importMapLibre } from "@/lib/features/locations/load-maplibre";
import { workspaceMapStyle } from "@/lib/features/locations/workspace-map-style";
import { hasSpotCoordinates, type SpotPlace } from "@/lib/features/find-a-spot/matching";

export function SpotMap({ places }: { places: SpotPlace[] }) {
  const container = useRef<HTMLDivElement>(null);
  const initial = places.find(hasSpotCoordinates);
  const initialCenter = useRef<[number, number]>(initial ? [initial.longitude, initial.latitude] : [0, 0]);
  const [state, setState] = useState<{ map: MapLibreMap; lib: Awaited<ReturnType<typeof importMapLibre>> } | "failed" | null>(null);

  useEffect(() => {
    let active = true;
    let map: MapLibreMap | undefined;
    importMapLibre().then((lib) => {
      if (!active || !container.current) return;
      map = new lib.Map({
        container: container.current, style: workspaceMapStyle, center: initialCenter.current, zoom: 13,
        scrollZoom: false, attributionControl: { compact: true },
      });
      map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      setState({ map, lib });
    }).catch(() => { if (active) setState("failed"); });
    return () => { active = false; map?.remove(); };
  }, []);

  useEffect(() => {
    if (!state || state === "failed") return;
    const { map, lib } = state;
    const bounds = new lib.LngLatBounds();
    const groups = new Map<string, (SpotPlace & { latitude: number; longitude: number })[]>();
    for (const place of places.filter(hasSpotCoordinates)) {
      const key = `${place.longitude},${place.latitude}`;
      const group = groups.get(key);
      if (group) group.push(place);
      else groups.set(key, [place]);
    }
    const markers = Array.from(groups.values(), (group) => {
      const first = group[0];
      const coordinates: [number, number] = [first.longitude, first.latitude];
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "grid size-8 place-items-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-md hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
      pin.title = group.length === 1 ? first.name : `${group.length} places at this pin`;
      pin.setAttribute("aria-label", group.length === 1 ? `Show ${first.name} in the list` : `Show ${group.length} places at this pin`);
      const marker = new lib.Marker({ element: pin }).setLngLat(coordinates).addTo(map);
      // MapLibre sets a generic marker role; restore the native button semantics.
      pin.removeAttribute("role");
      if (group.length === 1) {
        const dot = document.createElement("span");
        dot.className = "size-2.5 rounded-full bg-current";
        pin.appendChild(dot);
        pin.addEventListener("click", () => document.getElementById(`spot-${first.id}`)?.focus());
      } else {
        pin.textContent = String(group.length);
        pin.setAttribute("aria-expanded", "false");
        const list = document.createElement("ul");
        list.className = "max-h-40 max-w-52 space-y-0.5 overflow-y-auto rounded-md bg-background px-1 pb-1 pt-4 text-sm text-foreground";
        const popup = new lib.Popup({ offset: 16, focusAfterOpen: false }).setDOMContent(list).setLngLat(coordinates);
        popup.on("close", () => pin.setAttribute("aria-expanded", "false"));
        for (const place of group) {
          const item = document.createElement("li");
          const button = document.createElement("button");
          button.type = "button";
          button.className = "block min-h-9 w-full rounded-sm px-2 py-1 text-left [overflow-wrap:anywhere] hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";
          button.textContent = place.name;
          button.addEventListener("click", () => {
            popup.remove();
            document.getElementById(`spot-${place.id}`)?.focus();
          });
          item.appendChild(button);
          list.appendChild(item);
        }
        pin.addEventListener("click", (event) => {
          event.stopPropagation();
          if (popup.isOpen()) { popup.remove(); return; }
          popup.addTo(map);
          pin.setAttribute("aria-expanded", "true");
          list.querySelector("button")?.focus();
        });
        list.addEventListener("keydown", (event) => {
          if (event.key === "Escape") { popup.remove(); pin.focus(); }
        });
        bounds.extend(coordinates);
        return () => { popup.remove(); marker.remove(); };
      }
      bounds.extend(coordinates);
      return () => marker.remove();
    });
    if (markers.length > 1) map.fitBounds(bounds, { padding: { top: 52, right: 48, bottom: 64, left: 40 }, maxZoom: 15, duration: 0 });
    else if (markers.length === 1) map.jumpTo({ center: bounds.getCenter(), zoom: 14 });
    return () => markers.forEach((remove) => remove());
  }, [places, state]);

  return (
    <div className="relative h-64 overflow-hidden rounded-lg bg-muted sm:h-80 lg:h-[25rem]">
      <div ref={container} aria-label="Map of listed places" className="h-full w-full [&_.maplibregl-popup-close-button]:text-foreground [&_.maplibregl-popup-content]:bg-background [&_.maplibregl-popup-tip]:hidden" />
      {(!state || state === "failed") && <p role="status" className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-muted-foreground">
        {state === "failed" ? "Map unavailable. You can still use the list and directions." : "Loading map…"}
      </p>}
    </div>
  );
}
