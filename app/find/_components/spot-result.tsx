"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Building2, Check, Navigation, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkspaceDirections } from "@/lib/features/locations/directions";
import { FACT_CHECK_MAX_AGE_MS, type SpotCandidate } from "@/lib/features/find-a-spot/matching";

const checkDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function SpotResult({ candidate, city, now }: { candidate: SpotCandidate; city: string; now: number }) {
  const { place, reasons, toCheck, distance } = candidate;
  const directions = getWorkspaceDirections(place);
  const [brokenPhoto, setBrokenPhoto] = useState<string | null>(null);
  const showPhoto = place.photoUrl?.startsWith("https://") && brokenPhoto !== place.photoUrl;
  const checked = Date.parse(place.checkedAt ?? "");
  return (
    <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-4">
      <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
        {showPhoto && place.photoUrl ? <Image unoptimized src={place.photoUrl} alt="" fill sizes="72px" referrerPolicy="no-referrer"
          className="object-cover" onError={() => setBrokenPhoto(place.photoUrl)} /> : <Building2 className="size-5" aria-hidden="true" />}
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="text-xs capitalize text-muted-foreground">
          {place.type.replaceAll("_", " ")}{distance !== null && ` · ${distance < 0.1 ? "< 0.1" : distance.toFixed(1)} km away`}
        </p>
        <h3 className="font-semibold [overflow-wrap:anywhere]">
          <Link id={`spot-${place.id}`} href={`/cities/${encodeURIComponent(city)}/${encodeURIComponent(place.slug)}`} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {place.name}
          </Link>
        </h3>
        {place.address && <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{place.address}</p>}
        {toCheck.length ? <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Check:</span> {toCheck.join(" · ")}</p> : (
          <p className="flex items-start gap-1.5 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{reasons.join(" · ")}</span></p>
        )}
        {checked <= now && now - checked <= FACT_CHECK_MAX_AGE_MS && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" aria-hidden="true" /> Work facts checked {checkDate.format(checked)}</p>
        )}
      </div>
      {directions && <Button variant="outline" size="sm" asChild className="col-start-2 min-h-9 w-fit sm:col-start-3 sm:self-start">
        <a href={directions} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${place.name} (opens in a new tab)`}><Navigation aria-hidden="true" /> Directions</a>
      </Button>}
    </li>
  );
}
