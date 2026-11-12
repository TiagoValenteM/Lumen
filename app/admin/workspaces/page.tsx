"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AccessRestricted,
  FeedbackState,
  LoadingState,
  MetricButton,
  PageContainer,
  PageHeader,
  PageShell,
  SectionPanel,
} from "@/components/shared";
import { Building2, Pencil, Filter, Shield, MapPin, CheckCircle, XCircle, Clock, Wrench, Globe2, Loader2 } from "lucide-react";

type AiStatus = "none" | "queued" | "researching" | "extracting" | "pending" | "ready_for_review" | "completed" | "failed" | "dismissed" | "applied";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  created_at: string | null;
  submitted_by: string | null;
  city_slug: string | null;
  city_name: string | null;
  country: string | null;
  short_description?: string | null;
  ai_status: AiStatus;
  ai_run_mode: string | null;
  ai_error: string | null;
};

type WorkspaceQueryRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  created_at: string | null;
  submitted_by: string | null;
  short_description: string | null;
  city:
    | { slug: string | null; name: string | null; country: string | null }
    | { slug: string | null; name: string | null; country: string | null }[]
    | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Needs fixes" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_META = {
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600" },
  under_review: { label: "Needs fixes", icon: Wrench, color: "text-blue-600" },
  approved: { label: "Approved", icon: CheckCircle, color: "text-green-600" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-600" },
} as const;

const AI_FILTER_OPTIONS = [
  { value: "all", label: "All AI" },
  { value: "ready", label: "Ready" },
  { value: "running", label: "Running" },
  { value: "failed", label: "Failed" },
  { value: "applied", label: "Applied" },
  { value: "dismissed", label: "Dismissed" },
  { value: "none", label: "No AI" },
];

type AiRunRow = {
  id: string;
  workspace_id: string;
  status: string | null;
  run_mode: string | null;
  error_message: string | null;
  created_at: string | null;
};

type WorkspaceGroup = {
  country: string;
  total: number;
  cities: {
    city: string;
    total: number;
    workspaces: WorkspaceRow[];
  }[];
};

export default function AdminWorkspacesPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [aiFilter, setAiFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const counts = { all: workspaces.length, pending: 0, under_review: 0, approved: 0, rejected: 0 };
    for (const workspace of workspaces) {
      const status = normalizeStatus(workspace.status);
      counts[status] += 1;
    }
    return counts;
  }, [workspaces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workspaces.filter((w) => {
      const matchesStatus = statusFilter === "all" ? true : (w.status || "pending") === statusFilter;
      const matchesAi = matchesAiFilter(w, aiFilter);
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.city_name?.toLowerCase().includes(q) ?? false) ||
        (w.country?.toLowerCase().includes(q) ?? false) ||
        (w.slug?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesAi && matchesSearch;
    });
  }, [aiFilter, workspaces, search, statusFilter]);

  const grouped = useMemo(() => groupWorkspaces(filtered), [filtered]);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    const { data, error: profileError } = await supabase.rpc("is_admin");
    setIsAdmin(data === true);

    if (profileError) {
      console.error("Failed to load profile", profileError);
    }
    setLoadingProfile(false);
  }, [supabase, user]);

  const loadLatestAiRuns = useCallback(
    async (workspaceIds: string[]) => {
      const latestByWorkspace = new Map<string, AiRunRow>();
      if (workspaceIds.length === 0) return latestByWorkspace;

      const { data, error: aiError } = await supabase
        .from("workspace_ai_enrichments")
        .select("id, workspace_id, status, run_mode, error_message, created_at")
        .in("workspace_id", workspaceIds)
        .order("created_at", { ascending: false });

      if (aiError) {
        console.warn("Could not load workspace AI queue state", aiError);
        return latestByWorkspace;
      }

      for (const run of (data as AiRunRow[] | null) || []) {
        if (!latestByWorkspace.has(run.workspace_id)) latestByWorkspace.set(run.workspace_id, run);
      }
      return latestByWorkspace;
    },
    [supabase],
  );

  const loadWorkspaces = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const query = supabase
        .from("workspaces")
        .select(
          `
          id,
          name,
          slug,
          status,
          created_at,
          submitted_by,
          short_description,
          city:cities(slug, name, country)
        `
        )
        .order("created_at", { ascending: false });

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const baseRows: WorkspaceRow[] =
        (data as WorkspaceQueryRow[] | null)?.map((w) => {
          const cityField = Array.isArray(w.city) ? w.city[0] ?? null : w.city;
          return {
            id: w.id,
            name: w.name,
            slug: w.slug,
            status: w.status,
            created_at: w.created_at,
            submitted_by: w.submitted_by ?? null,
            city_slug: cityField?.slug ?? null,
            city_name: cityField?.name ?? null,
            country: cityField?.country ?? null,
            short_description: w.short_description ?? null,
            ai_status: "none",
            ai_run_mode: null,
            ai_error: null,
          };
        }) || [];

      const latestAiByWorkspace = await loadLatestAiRuns(baseRows.map((workspace) => workspace.id));
      setWorkspaces(
        baseRows.map((workspace) => {
          const aiRun = latestAiByWorkspace.get(workspace.id);
          return {
            ...workspace,
            ai_status: normalizeAiStatus(aiRun?.status ?? null),
            ai_run_mode: aiRun?.run_mode ?? null,
            ai_error: aiRun?.error_message ?? null,
          };
        }),
      );
    } catch (err) {
      console.error("Failed to load workspaces", err);
      setError("Could not load workspaces. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase, isAdmin, loadLatestAiRuns]);

  useEffect(() => {
    // Admin profile is loaded from Supabase when the authenticated user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isAdmin) {
      // Workspace rows are loaded from Supabase after admin access is confirmed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadWorkspaces();
    }
  }, [isAdmin, loadWorkspaces]);

  const updateStatus = async (id: string, status: "approved" | "rejected" | "pending" | "under_review") => {
    if (!user || !isAdmin) return;
    if (status === "rejected" || status === "under_review") {
      setError("Open the workspace detail page to add a submitter-facing reason before changing to that status.");
      return;
    }
    setSavingId(id);
    try {
      const { error: updateError } = await supabase
        .from("workspaces")
        .update({ status })
        .eq("id", id);
      if (updateError) throw updateError;
      if (status === "approved") {
        const { error: photoError } = await supabase
          .from("workspace_photos")
          .update({ is_approved: true })
          .eq("workspace_id", id);
        if (photoError) {
          console.warn("Workspace status saved, but photos could not be auto-approved", photoError);
        }
      }
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status } : w))
      );
    } catch (err) {
      console.error("Failed to update status", err);
      setError("Could not update workspace status. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  if (loadingProfile) {
    return <LoadingState label="Checking access..." />;
  }

  if (!isAdmin) {
    return (
      <AccessRestricted
        icon={Shield}
        description="You need admin access to view this page."
      />
    );
  }

  return (
    <PageShell>
      <PageContainer>
        <PageHeader
          title="Admin · Workspaces"
          description="Review, approve, or edit submitted workspaces."
          actions={
            <>
            <Input
              placeholder="Search by name, city, country, or slug"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={aiFilter} onValueChange={setAiFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="AI" />
              </SelectTrigger>
              <SelectContent>
                {AI_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => loadWorkspaces()} className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Refresh
            </Button>
            <Button asChild variant="outline" className="inline-flex items-center gap-2">
              <Link href="/admin/cities">
                <Building2 className="h-4 w-4" />
                Cities
              </Link>
            </Button>
            </>
          }
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {STATUS_OPTIONS.map((option) => {
            const isAll = option.value === "all";
            const meta = isAll ? null : STATUS_META[option.value as keyof typeof STATUS_META];
            const Icon = meta?.icon || Building2;
            const count = statusCounts[option.value as keyof typeof statusCounts] ?? 0;
            return (
              <MetricButton
                key={option.value}
                label={option.label}
                value={count}
                icon={Icon}
                iconClassName={meta?.color}
                active={statusFilter === option.value}
                onClick={() => setStatusFilter(option.value)}
              />
            );
          })}
        </div>

        <SectionPanel>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Workspaces by location</CardTitle>
              <CardDescription>
                {filtered.length} {filtered.length === 1 ? "workspace" : "workspaces"} shown across {grouped.length} {grouped.length === 1 ? "country" : "countries"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading workspaces...</span>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && !error && filtered.length === 0 && (
              <FeedbackState
                icon={Building2}
                title="No workspaces found"
                description="Try another status, city, country, or search term."
              />
            )}
            <div className="space-y-5">
              {grouped.map((countryGroup) => (
                <section key={countryGroup.country} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                      <h2 className="truncate text-base font-semibold">{countryGroup.country}</h2>
                    </div>
                    <Badge variant="secondary">{countryGroup.total} places</Badge>
                  </div>

                  <div className="space-y-4">
                    {countryGroup.cities.map((cityGroup) => (
                      <div key={`${countryGroup.country}-${cityGroup.city}`} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <h3 className="text-sm font-medium">{cityGroup.city}</h3>
                          <Badge variant="outline">{cityGroup.total}</Badge>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-border/35 bg-background/55 shadow-sm shadow-black/5">
                          <div className="divide-y divide-border/40">
                            {cityGroup.workspaces.map((ws) => (
                              <WorkspaceListRow
                                key={ws.id}
                                workspace={ws}
                                saving={savingId === ws.id}
                                onStatusChange={updateStatus}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </CardContent>
        </SectionPanel>
      </PageContainer>
    </PageShell>
  );
}

function WorkspaceListRow({
  workspace,
  saving,
  onStatusChange,
}: {
  workspace: WorkspaceRow;
  saving: boolean;
  onStatusChange: (id: string, status: "approved" | "rejected" | "pending" | "under_review") => void;
}) {
  const status = normalizeStatus(workspace.status);
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_150px_170px_44px] md:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h4 className="truncate font-medium leading-tight">{workspace.name}</h4>
          <Badge variant="outline" className="capitalize">{meta.label}</Badge>
          <AiStatusBadge status={workspace.ai_status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="truncate">{workspace.slug}</span>
          {workspace.short_description && <span className="truncate md:max-w-[360px]">{workspace.short_description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-4 w-4 ${meta.color}`} />
        <span>{meta.label}</span>
      </div>
      <Select
        value={status}
        onValueChange={(val) => onStatusChange(workspace.id, val as "approved" | "rejected" | "pending" | "under_review")}
        disabled={saving}
      >
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="under_review">Needs fixes</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-9 w-9 p-0" asChild>
        <Link href={`/admin/workspaces/${workspace.id}`} aria-label={`Edit ${workspace.name}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function normalizeStatus(status: string | null): "pending" | "under_review" | "approved" | "rejected" {
  if (status === "approved" || status === "rejected" || status === "under_review") return status;
  return "pending";
}

function normalizeAiStatus(status: string | null): AiStatus {
  if (
    status === "queued" ||
    status === "researching" ||
    status === "extracting" ||
    status === "pending" ||
    status === "ready_for_review" ||
    status === "completed" ||
    status === "failed" ||
    status === "dismissed" ||
    status === "applied"
  ) {
    return status;
  }
  return "none";
}

function matchesAiFilter(workspace: WorkspaceRow, filter: string) {
  if (filter === "all") return true;
  if (filter === "none") return workspace.ai_status === "none";
  if (filter === "failed") return workspace.ai_status === "failed";
  if (filter === "applied") return workspace.ai_status === "applied";
  if (filter === "dismissed") return workspace.ai_status === "dismissed";
  if (filter === "ready") return workspace.ai_status === "ready_for_review" || workspace.ai_status === "completed";
  if (filter === "running") return ["queued", "researching", "extracting", "pending"].includes(workspace.ai_status);
  return true;
}

function AiStatusBadge({ status }: { status: AiStatus }) {
  if (status === "none") return null;
  if (status === "failed") return <Badge variant="destructive">AI failed</Badge>;
  if (status === "ready_for_review" || status === "completed") return <Badge variant="default">AI ready</Badge>;
  if (status === "applied") return <Badge variant="secondary">AI applied</Badge>;
  if (status === "dismissed") return <Badge variant="outline">AI hidden</Badge>;
  return <Badge variant="secondary">AI running</Badge>;
}

function groupWorkspaces(workspaces: WorkspaceRow[]): WorkspaceGroup[] {
  const countries = new Map<string, Map<string, WorkspaceRow[]>>();
  for (const workspace of workspaces) {
    const country = workspace.country || "Unknown country";
    const city = workspace.city_name || "Unspecified city";
    const cities = countries.get(country) ?? new Map<string, WorkspaceRow[]>();
    const rows = cities.get(city) ?? [];
    rows.push(workspace);
    cities.set(city, rows);
    countries.set(country, cities);
  }

  return Array.from(countries.entries())
    .map(([country, cities]) => {
      const cityGroups = Array.from(cities.entries())
        .map(([city, rows]) => ({
          city,
          total: rows.length,
          workspaces: rows,
        }))
        .sort((a, b) => b.total - a.total || a.city.localeCompare(b.city));

      return {
        country,
        total: cityGroups.reduce((sum, city) => sum + city.total, 0),
        cities: cityGroups,
      };
    })
    .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));
}
