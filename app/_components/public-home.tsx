import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Coffee, MapPin, Search, ShieldCheck, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const featuredUseCases = ["Quiet work", "Calls", "Long stays", "Power access"];

export function PublicHome() {
  return (
    <div className="min-h-full bg-background">
      <section className="px-6 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center">
          <div className="space-y-7">
            <div className="flex flex-wrap gap-2">
              {featuredUseCases.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                Find laptop-friendly places to work.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
                Lumen helps remote workers discover cafes, coworking spaces, libraries, and hotel lobbies that are actually useful for focused work.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/cities">
                  <Search className="mr-2 h-5 w-5" />
                  Explore workspaces
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/add-workspace">
                  Add a place
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-card/90 p-5 shadow-md shadow-black/5 dark:shadow-black/20">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Workspace assessment</p>
                <h2 className="mt-1 text-2xl font-semibold">What Lumen checks</h2>
              </div>
              <div className="grid gap-3">
                <SignalRow icon={<Wifi className="h-4 w-4" />} label="Reliable WiFi" value="Fast enough to work" />
                <SignalRow icon={<Zap className="h-4 w-4" />} label="Power access" value="Outlets and stay length" />
                <SignalRow icon={<Coffee className="h-4 w-4" />} label="Work welcome" value="Purchase policy and comfort" />
                <SignalRow icon={<ShieldCheck className="h-4 w-4" />} label="Community trust" value="Verified details and corrections" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <ValueCard
            icon={<MapPin className="h-5 w-5" />}
            title="Browse by city"
            body="Start with a city, then narrow by noise, power, long stays, and work style."
          />
          <ValueCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Read workability reports"
            body="Each place is framed around productivity, comfort, and what to know before going."
          />
          <ValueCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Keep data fresh"
            body="Members can submit places, suggest corrections, and help remove stale information."
          />
        </div>
      </section>

      <section className="border-y bg-muted/20 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Already know a good work spot?</h2>
            <p className="mt-2 text-muted-foreground">
              Add it for review and help other people find places where work feels easy.
            </p>
          </div>
          <Button asChild>
            <Link href="/add-workspace">
              Submit a workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="bg-card/40 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-sm text-muted-foreground md:flex-row md:text-left">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <span>© {new Date().getFullYear()} Lumen</span>
            <span className="text-xs">Proudly developed in Switzerland 🇨🇭</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/legal/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="mailto:support@lumen.com" className="transition-colors hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SignalRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/30 bg-background/70 p-3 shadow-sm shadow-black/5 dark:shadow-black/20">
      <div className="flex items-center gap-3">
        <span className="text-primary">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-right text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function ValueCard({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <Card className="rounded-xl transition-colors hover:bg-card">
      <CardHeader>
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
