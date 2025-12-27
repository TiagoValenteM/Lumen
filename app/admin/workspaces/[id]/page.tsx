"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shield, ArrowLeft, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type WorkspaceDetailMinimal = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  short_description: string | null;
  address: string | null;
  city_slug: string | null;
  city_name: string | null;
  submitted_by: string | null;
};

const STATUS_OPTIONS = ["pending", "approved", "rejected"];

export default function AdminWorkspaceDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : null;
  const supabase = createClient();
  const router = useRouter();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetailMinimal | null>(null);
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    address: "",
    status: "pending",
  });

  const statusBadge = useMemo(() => workspace?.status || "pending", [workspace]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Failed to load profile", profileError);
    } else {
      setIsAdmin(Boolean(data?.is_admin));
    }
    setLoadingProfile(false);
  }, [supabase, user]);

  const loadWorkspace = useCallback(async () => {
    if (!user || !isAdmin || !id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("workspaces")
        .select(
          `
          id,
          name,
          slug,
          status,
          short_description,
          address,
          submitted_by,
          city:cities(slug, name)
        `
        )
        .eq("id", id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!data) {
        setError("Workspace not found.");
        setLoading(false);
        return;
      }
      const cityField = Array.isArray((data as any).city) ? (data as any).city[0] ?? null : (data as any).city;
      const mapped: WorkspaceDetailMinimal = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        status: data.status,
        short_description: data.short_description,
        address: data.address,
        submitted_by: data.submitted_by ?? null,
        city_slug: cityField?.slug ?? null,
        city_name: cityField?.name ?? null,
      };
      setWorkspace(mapped);
      setForm({
        name: mapped.name || "",
        short_description: mapped.short_description || "",
        address: mapped.address || "",
        status: mapped.status || "pending",
      });
    } catch (err) {
      console.error("Failed to load workspace", err);
      setError("Could not load workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, id, supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isAdmin) {
      loadWorkspace();
    }
  }, [isAdmin, loadWorkspace]);

  const handleSave = async () => {
    if (!user || !isAdmin || !workspace) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("workspaces")
        .update({
          name: form.name,
          short_description: form.short_description,
          address: form.address,
          status: form.status,
        })
        .eq("id", workspace.id);
      if (updateError) throw updateError;
      router.refresh();
    } catch (err) {
      console.error("Failed to save workspace", err);
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Workspace not found</CardTitle>
            <CardDescription>Try returning to the admin list.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/workspaces">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to admin list
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Edit workspace</h1>
            <p className="text-muted-foreground text-sm">Admin-only edit for submitted workspaces.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/workspaces">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to admin list
            </Link>
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {workspace.name}
                <Badge variant="outline" className="capitalize">
                  {statusBadge}
                </Badge>
              </CardTitle>
              <CardDescription>
                {workspace.city_name || "Unspecified city"} · Slug: {workspace.slug}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Workspace name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Short description</label>
              <Textarea
                value={form.short_description}
                onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))}
                placeholder="A concise summary for this workspace"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/cities/${workspace.city_slug ?? ""}/${workspace.slug}`} target="_blank">
                  Public view
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
