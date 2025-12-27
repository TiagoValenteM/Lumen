"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, Filter, Shield, ArrowLeft, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  created_at: string | null;
  submitted_by: string | null;
  city_slug: string | null;
  city_name: string | null;
  short_description?: string | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function AdminWorkspacesPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workspaces.filter((w) => {
      const matchesStatus = statusFilter === "all" ? true : (w.status || "pending") === statusFilter;
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.city_name?.toLowerCase().includes(q) ?? false) ||
        (w.slug?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesSearch;
    });
  }, [workspaces, search, statusFilter]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to load profile", profileError);
    } else {
      setIsAdmin(Boolean(data?.is_admin));
    }
    setLoadingProfile(false);
  }, [supabase, user]);

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
          city:cities(slug, name)
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mapped: WorkspaceRow[] =
        data?.map((w: any) => {
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
            short_description: w.short_description ?? null,
          };
        }) || [];

      setWorkspaces(mapped);
    } catch (err) {
      console.error("Failed to load workspaces", err);
      setError("Could not load workspaces. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase, isAdmin, statusFilter]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isAdmin) {
      loadWorkspaces();
    }
  }, [isAdmin, loadWorkspaces]);

  const updateStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    if (!user || !isAdmin) return;
    setSavingId(id);
    try {
      const { error: updateError } = await supabase
        .from("workspaces")
        .update({ status })
        .eq("id", id);
      if (updateError) throw updateError;
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking access...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access restricted
            </CardTitle>
            <CardDescription>You need admin access to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/profile">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Admin · Workspaces</h1>
            <p className="text-muted-foreground text-sm">
              Review, approve, or edit submitted workspaces.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search by name, city, or slug"
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
            <Button variant="outline" onClick={() => loadWorkspaces()} className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Workspaces</CardTitle>
              <CardDescription>
                {filtered.length} {filtered.length === 1 ? "workspace" : "workspaces"} shown
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
              <p className="text-sm text-muted-foreground">No workspaces match this filter.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((ws) => {
                const statusColor = 
                  ws.status === "approved" ? "text-green-600 bg-green-50 border-green-200" : 
                  ws.status === "rejected" ? "text-red-600 bg-red-50 border-red-200" : 
                  "text-yellow-600 bg-yellow-50 border-yellow-200";
                
                return (
                  <Card key={ws.id} className="border-muted hover:border-primary/50 transition-colors">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold leading-tight truncate">{ws.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{ws.city_name || "Unspecified city"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="h-8 w-8 rounded-md border border-input bg-background flex items-center justify-center">
                            {ws.status === "approved" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            ) : ws.status === "rejected" ? (
                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-yellow-600" />
                            )}
                          </div>
                          <Select
                            value={ws.status || "pending"}
                            onValueChange={(val) => updateStatus(ws.id, val as "approved" | "rejected" | "pending")}
                            disabled={savingId === ws.id}
                          >
                            <SelectTrigger className="h-8 w-[110px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                            <Link href={`/admin/workspaces/${ws.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
