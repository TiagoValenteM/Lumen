"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { readWorkspaceCityProposals } from "@/lib/features/locations/workspace-city-proposals";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AccessRestricted,
  FeedbackState,
  LoadingState,
  PageContainer,
  PageHeader,
  PageShell,
} from "@/components/shared";
import { Building2, ArrowRight, RefreshCw, Search, Shield, MapPin, Loader2 } from "lucide-react";
import { InlineFeedback } from "@/components/shared/inline-feedback";
import { ModerationStatus } from "../_components/moderation-status";
import { getAiStatusPresentation } from "./_lib/status-presentation";

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
      const queryRows = (data ?? []) as WorkspaceQueryRow[];
      const [proposals, latestAiByWorkspace] = await Promise.all([
        readWorkspaceCityProposals(supabase, queryRows.filter((row) => !row.city || (Array.isArray(row.city) && !row.city.length)).map((row) => row.id)),
        loadLatestAiRuns(queryRows.map((row) => row.id)),
      ]);

      const baseRows: WorkspaceRow[] =
        queryRows.map((w) => {
          const cityField = Array.isArray(w.city) ? w.city[0] ?? null : w.city;
          const proposal = proposals.get(w.id);
          return {
            id: w.id,
            name: w.name,
            slug: w.slug,
            status: w.status,
            created_at: w.created_at,
            submitted_by: w.submitted_by ?? null,
            city_slug: cityField?.slug ?? null,
            city_name: cityField?.name ?? proposal?.name ?? null,
            country: cityField?.country ?? proposal?.country ?? null,
            short_description: w.short_description ?? null,
            ai_status: "none",
            ai_run_mode: null,
            ai_error: null,
          };
        });

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
      <PageContainer className="gap-4 py-5 sm:gap-5 sm:py-8">
        <PageHeader
          title="Place moderation"
          actions={
            <>
            <Button type="button" variant="ghost" onClick={() => loadWorkspaces()} disabled={loading} className="min-h-11">
              <RefreshCw className={loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" />
              Refresh
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/admin/cities">
                <Building2 className="h-4 w-4" />
                Cities
              </Link>
            </Button>
            </>
          }
        />

        <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3" role="group" aria-label="Filter by place status">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <Button key={value} type="button" variant={statusFilter === value ? "secondary" : "ghost"}
              className="min-h-11" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>
              {label} <span className="tabular-nums text-muted-foreground">{statusCounts[value as keyof typeof statusCounts]}</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-40 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Search places" type="search" placeholder="Name, city, country or slug"
              value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 pl-9" />
          </div>
          <Select value={aiFilter} onValueChange={setAiFilter}>
            <SelectTrigger aria-label="Filter by AI status" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_FILTER_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <section aria-label="Places by location" className="space-y-4">
          {!loading && !error && <p role="status" className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "place" : "places"} · {grouped.length} {grouped.length === 1 ? "country" : "countries"}
          </p>}
            {loading && (
              <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                <span>Loading places…</span>
              </div>
            )}
            {error && <InlineFeedback error>{error}</InlineFeedback>}
            {!loading && !error && filtered.length === 0 && (
              <FeedbackState
                icon={Building2}
                title="No workspaces found"
                description="Try another status, city, country, or search term."
              />
            )}
            <div className="space-y-5">
              {grouped.map((countryGroup) => (
                <section key={countryGroup.country} className="min-w-0 space-y-3">
                  <div className="flex items-baseline justify-between gap-2 border-b border-border/60 pb-2">
                    <h2 className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere]">{countryGroup.country}</h2>
                    <span className="shrink-0 text-xs text-muted-foreground">{countryGroup.total}</span>
                  </div>

                  <div className="space-y-4">
                    {countryGroup.cities.map((cityGroup) => (
                      <div key={`${countryGroup.country}-${cityGroup.city}`} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          <h3 className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{cityGroup.city}</h3>
                          <span className="text-xs text-muted-foreground">{cityGroup.total}</span>
                        </div>
                        <ul className="divide-y divide-border/55 border-y border-border/55">
                            {cityGroup.workspaces.map((ws) => (
                              <WorkspaceListRow
                                key={ws.id}
                                workspace={ws}
                                saving={savingId === ws.id}
                                onStatusChange={updateStatus}
                              />
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
        </section>
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
  const ai = getAiStatusPresentation(workspace.ai_status);

  return (
    <li className="grid gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <div className="min-w-0">
        <Link href={`/admin/workspaces/${workspace.id}`} className="keyboard-focus inline-flex min-h-11 items-center gap-1.5 rounded-sm font-medium [overflow-wrap:anywhere] hover:text-primary">
          <span className="min-w-0">{workspace.name}</span><ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:contents">
      <ModerationStatus label={`AI: ${ai.label}`} tone={ai.tone} />
      <Select
        value={status}
        onValueChange={(val) => onStatusChange(workspace.id, val as "approved" | "rejected" | "pending" | "under_review")}
        disabled={saving}
      >
        <SelectTrigger aria-label={`Status for ${workspace.name}`} className="min-h-11 min-w-28 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="under_review">Needs fixes</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      </div>
    </li>
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
