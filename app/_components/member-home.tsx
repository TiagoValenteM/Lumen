import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bookmark, Building2, MapPin, MapPinCheck, Plus, Shield, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomeSubmissionSummary, HomeWorkspaceSummary, MemberHomeData } from "@/lib/features/home/member-home-data";

type MemberHomeProps = {
  data: MemberHomeData;
};

export function MemberHome({ data }: MemberHomeProps) {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section className="flex flex-col gap-5 border-b pb-8 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{data.displayName}</h1>
            <p className="max-w-2xl text-muted-foreground">
              Pick up where you left off, keep track of your places, and help Lumen stay useful for the next remote worker.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/cities">
                <MapPin className="mr-2 h-4 w-4" />
                Explore
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/add-workspace">
                <Plus className="mr-2 h-4 w-4" />
                Add place
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard href="/saved" icon={<Bookmark className="h-5 w-5" />} label="Saved" value={data.savedCount} />
          <StatCard href="/visited" icon={<MapPinCheck className="h-5 w-5" />} label="Visited" value={data.visitedCount} />
          <StatCard href="/profile/my-workspaces" icon={<Building2 className="h-5 w-5" />} label="Submitted" value={data.submittedCount} />
          <StatCard href="/profile/my-workspaces" icon={<Shield className="h-5 w-5" />} label="Needs review" value={data.pendingCount} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <HomeListCard
            title="Recent saved places"
            description="Your quickest route back to useful work spots."
            empty="No saved places yet."
            actionHref="/saved"
            actionLabel="View saved"
          >
            {data.recentSaved.map((workspace) => (
              <WorkspaceListItem key={workspace.id} workspace={workspace} />
            ))}
          </HomeListCard>

          <HomeListCard
            title="Your latest submissions"
            description="Track what you have added to Lumen."
            empty="No submitted places yet."
            actionHref="/profile/my-workspaces"
            actionLabel="View submissions"
          >
            {data.recentSubmissions.map((workspace) => (
              <SubmissionListItem key={workspace.id} workspace={workspace} />
            ))}
          </HomeListCard>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <ActionCard
            href="/cities"
            title="Find your next work session"
            body="Browse by city, filter by work style, and compare workability before you go."
          />
          <ActionCard
            href="/profile"
            title="Tune your profile"
            body="Review your badges, nearby recommendations, saved places, and visited history."
          />
          {data.isAdmin ? (
            <ActionCard
              href="/admin/workspaces"
              title="Admin review queue"
              body="Review submitted places, moderate photos, and keep city data clean."
            />
          ) : (
            <ActionCard
              href="/add-workspace"
              title="Share a reliable spot"
              body="Submit a place that has the basics remote workers care about."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ href, icon, label, value }: { href: string; icon: ReactNode; label: string; value: number }) {
  return (
    <Link href={href}>
      <Card className="h-full rounded-lg transition-colors hover:border-primary/50">
        <CardContent className="flex items-center justify-between gap-4 py-5">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function HomeListCard({
  actionHref,
  actionLabel,
  children,
  description,
  empty,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
  description: string;
  empty: string;
  title: string;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={actionHref}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkspaceListItem({ workspace }: { workspace: HomeWorkspaceSummary }) {
  const href = getWorkspaceHref(workspace);

  return (
    <Link href={href} className="flex items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:border-primary/50">
      <div className="min-w-0">
        <p className="truncate font-medium">{workspace.name}</p>
        <p className="text-sm text-muted-foreground">{workspace.cityName || "Unknown city"}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function SubmissionListItem({ workspace }: { workspace: HomeSubmissionSummary }) {
  const href = getWorkspaceHref(workspace);

  return (
    <Link href={href} className="flex items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:border-primary/50">
      <div className="min-w-0">
        <p className="truncate font-medium">{workspace.name}</p>
        <p className="text-sm text-muted-foreground">{workspace.cityName || "Unknown city"}</p>
      </div>
      <Badge variant="secondary" className="capitalize">
        {(workspace.status || "draft").replace("_", " ")}
      </Badge>
    </Link>
  );
}

function ActionCard({ body, href, title }: { body: string; href: string; title: string }) {
  return (
    <Link href={href}>
      <Card className="h-full rounded-lg transition-colors hover:border-primary/50">
        <CardHeader>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function getWorkspaceHref(workspace: HomeWorkspaceSummary) {
  if (!workspace.citySlug) return "/cities";
  return `/cities/${workspace.citySlug}/${workspace.slug}`;
}
