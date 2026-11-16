"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Building2, Check, Coffee, Landmark, Navigation, ShieldCheck } from "lucide-react";
import { getWorkspaceDirections } from "@/lib/features/locations/directions";
import { FACT_CHECK_MAX_AGE_MS, type SpotCandidate } from "@/lib/features/find-a-spot/matching";

const checkDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function SpotResult({ candidate, city, now }: { candidate: SpotCandidate; city: string; now: number }) {
  const { place, reasons, toCheck, distance, sessionEvidence } = candidate;
  const directions = getWorkspaceDirections(place);
  const [brokenPhoto, setBrokenPhoto] = useState<string | null>(null);
  const showPhoto = place.photoUrl?.startsWith("https://") && brokenPhoto !== place.photoUrl;
  const checked = Date.parse(place.checkedAt ?? "");
  const website = place.website && /^https?:\/\//i.test(place.website) ? place.website : null;
  const phone = place.phone && /^\+?[\d ().-]{6,26}$/.test(place.phone) ? place.phone : null;
  const PlaceIcon = place.type === "library" ? Landmark : place.type === "cafe" ? Coffee : Building2;
  return (
    <li className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 gap-y-1 py-3 sm:grid-cols-[3.75rem_minmax(0,1fr)_auto] sm:gap-x-4">
      <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-md text-muted-foreground sm:bg-muted">
        {showPhoto && place.photoUrl ? <Image unoptimized src={place.photoUrl} alt="" fill sizes="72px" referrerPolicy="no-referrer"
          className="hidden object-cover sm:block" onError={() => setBrokenPhoto(place.photoUrl)} /> : null}
        <PlaceIcon className={showPhoto ? "size-4 sm:hidden" : "size-4 sm:size-5"} aria-hidden="true" />
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
        {toCheck.length ? <div className="space-y-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          <p className="font-medium text-foreground">Still to confirm</p>
          <ul className="flex flex-wrap gap-x-2 gap-y-1" aria-label="Missing confirmations">
            {toCheck.map((item) => <li key={item} className="rounded-md bg-muted/65 px-2 py-1">{item}</li>)}
          </ul>
          {(phone || website) && <p className="flex flex-wrap gap-3">
            {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="py-1 underline underline-offset-2">Call venue</a>}
            {website && <a href={website} className="py-1 underline underline-offset-2">Venue website</a>}
          </p>}
        </div> : (
          <p className="flex items-start gap-1.5 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{reasons.join(" · ")}</span></p>
        )}
        {sessionEvidence && <p className="text-xs text-muted-foreground">
          {toCheck.length > 0 && "Published hours cover this session. "}{sessionEvidence.note}{" "}
          <a href={sessionEvidence.source} className="font-medium text-foreground underline underline-offset-2">
            {sessionEvidence.source === sessionEvidence.laptopSource ? "Venue hours and laptop policy" : "Venue hours"}
          </a>
          {sessionEvidence.source !== sessionEvidence.laptopSource && <> · <a href={sessionEvidence.laptopSource}
            className="font-medium text-foreground underline underline-offset-2">Laptop policy</a></>}
          {sessionEvidence.checkedAt && <> · Checked {checkDate.format(new Date(sessionEvidence.checkedAt))}</>}
        </p>}
        {checked <= now && now - checked <= FACT_CHECK_MAX_AGE_MS && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" aria-hidden="true" /> Work facts checked {checkDate.format(checked)}</p>
        )}
      </div>
      {directions && <a href={directions} target="_blank" rel="noopener noreferrer"
        className="col-start-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:col-start-3 sm:self-start"
        aria-label={`Directions to ${place.name} (opens in a new tab)`}><Navigation className="size-4" aria-hidden="true" /> Directions</a>}
    </li>
  );
}
