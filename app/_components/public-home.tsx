import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Compass, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/constants/brand";
import styles from "./public-home.module.css";

const library = "/cities/new-york-united-states/new-york-public-library-stephen-a-schwarzman-building-new-york";
const photoSource = "https://commons.wikimedia.org/wiki/File:New_York_Public_Library_Main_Branch_Exterior.jpg";

export function PublicHome() {
  return (
    <main>
      <section className="relative isolate flex min-h-[350px] items-end bg-[#1c2a23] text-white sm:min-h-[430px] lg:min-h-[min(60svh,580px)]">
        <Image
          src="/discovery/new-york-public-library.webp"
          alt="Stone arches and entrance of the New York Public Library"
          fill
          preload
          sizes="100vw"
          className="-z-20 object-cover object-center sm:object-[center_42%]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#101b16]/65 sm:bg-[#101b16]/60" />
        <div className={`${styles.heroCopy} mx-auto w-full max-w-6xl px-4 py-9 sm:px-6 sm:py-14 lg:py-16`}>
          <h1 className="max-w-xl text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl lg:text-6xl">
            Laptop-friendly places to work
          </h1>
          <p className="mt-3 max-w-lg text-base text-white sm:text-lg">
            Find a cafe, library or coworking space for your next work session.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button asChild className="h-11 bg-[#e3f0e6] text-[#172a20] hover:bg-white [--ring:#fff]">
              <Link href="/find"><Compass aria-hidden="true" /> Find a Spot <ArrowRight aria-hidden="true" /></Link>
            </Button>
            <Link href="/cities" className="keyboard-focus inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium underline decoration-white/60 underline-offset-4 [--ring:#fff] hover:decoration-white">
              Browse cities
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="featured-place" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-4 sm:px-6 sm:py-7">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><MapPin className="size-4" aria-hidden="true" /> New York</p>
          <h2 id="featured-place" className="mt-1 text-xl font-semibold sm:text-2xl">
            <Link href={library} className="keyboard-focus group inline-flex min-h-11 items-center gap-2 rounded-sm hover:underline hover:underline-offset-4">
              New York Public Library <ArrowRight className="size-4 shrink-0 text-primary motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="size-4" aria-hidden="true" /> Stephen A. Schwarzman Building · Midtown Manhattan</p>
        </div>
      </section>

      <section aria-labelledby="contribute" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-5 sm:px-6 sm:py-7">
        <h2 id="contribute" className="text-lg font-semibold">Know a good work spot?</h2>
        <Button variant="outline" asChild className="h-11">
          <Link href="/add-workspace"><Plus aria-hidden="true" /> Add a place</Link>
        </Button>
      </section>

      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-4 py-5 text-sm text-muted-foreground sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-5">
            <p>© {new Date().getFullYear()} {BRAND_NAME} · Proudly developed in Switzerland</p>
            <div className="flex flex-wrap gap-x-4">
              <Link href="/legal/terms" className="keyboard-focus inline-flex min-h-11 items-center hover:text-foreground">Terms</Link>
              <Link href="/legal/privacy" className="keyboard-focus inline-flex min-h-11 items-center hover:text-foreground">Privacy</Link>
              <a href="mailto:support@lumen.com" className="keyboard-focus inline-flex min-h-11 items-center hover:text-foreground">Contact</a>
            </div>
          </div>
          <p className="text-xs">
            <a href={photoSource} className="keyboard-focus underline underline-offset-2">Photo: Kidfly182</a>
            {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" className="keyboard-focus underline underline-offset-2">CC BY 4.0</a>
            {" · Cropped for layout"}
          </p>
        </div>
      </footer>
    </main>
  );
}
