"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, RefreshCw, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { AccessRestricted, PageContainer, PageHeader, PageShell } from "@/components/shared/lumen-page";

const labels = {
  closure_report: "Possible permanent closure",
  visit_report: "New visit reports",
  expired: "Verification expired",
  due_soon: "Verification due within 14 days",
  draft: "Private draft",
  unchecked: "Not verified",
} as const;
type Reason = keyof typeof labels;
type ReviewRow = { workspace_id: string; name: string; city: string | null; reason: Reason;
  checked_at: string | null; coverage_through: string | null; visit_reports: number; closure_reports: number; has_draft: boolean };
type Load = { key: string; rows?: ReviewRow[]; denied?: boolean };

export default function SessionReviewPage() {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const client = useMemo(() => createClient(), []);
  const [revision, setRevision] = useState(0);
  const [load, setLoad] = useState<Load>();
  const [reason, setReason] = useState("all");
  const [city, setCity] = useState("");
  const key = `${userId}:${revision}`;
  const current = load?.key === key ? load : undefined;
  const rows = current?.rows ?? [];
  const cities = Array.from(new Set(rows.flatMap((row) => row.city ? [row.city] : []))).sort();
  const filtered = rows.filter((row) => (reason === "all" || row.reason === reason) && (!city || row.city === city));

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void client.rpc("list_workspace_session_review").abortSignal(controller.signal).then(({ data, error }) => {
      if (!controller.signal.aborted) setLoad({ key, rows: error || !Array.isArray(data) ? undefined : data as ReviewRow[],
        denied: error?.code === "42501" });
    });
    return () => controller.abort();
  }, [client, key, userId]);

  if (!loading && (!user || current?.denied)) return <AccessRestricted icon={Shield} description="You need moderator access to view this queue." />;

  return <PageShell><PageContainer>
    <PageHeader title="Session review" description="Opening hours, laptop policies and visit reports that need attention."
      actions={<Button asChild variant="outline"><Link href="/admin/workspaces"><ArrowLeft aria-hidden="true" /> Workspaces</Link></Button>} />
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-0">
        <NativeSelect aria-label="Review reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="all">All review reasons</option>
          {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </NativeSelect>
      </div>
      <div className="min-w-0">
        <NativeSelect aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((item) => <option key={item}>{item}</option>)}
        </NativeSelect>
      </div>
      <Button type="button" variant="outline" onClick={() => setRevision((value) => value + 1)}><RefreshCw aria-hidden="true" /> Refresh</Button>
    </div>
    {!current ? <p role="status">Loading review queue…</p>
      : !current.rows ? <p role="alert">Could not load the review queue. Try refreshing.</p>
      : !filtered.length ? <p role="status">No places need review for these filters.</p>
      : <ul aria-label="Places awaiting session review" className="divide-y divide-border/60 border-y border-border/60">
        {filtered.map((row) => <li key={row.workspace_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
          <div className="min-w-0 flex-1 basis-56">
            <div className="flex flex-wrap items-center gap-2">
              <Link className="break-words font-semibold underline-offset-4 hover:underline" href={`/admin/workspaces/${row.workspace_id}`}>{row.name}</Link>
              <Badge variant={row.reason === "closure_report" ? "destructive" : "secondary"}>{labels[row.reason]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{[row.city, row.coverage_through && `Exceptions checked through ${row.coverage_through}`,
              row.visit_reports > 0 && `${row.visit_reports} visit report(s)`, row.closure_reports > 0 && `${row.closure_reports} closure report(s)`].filter(Boolean).join(" · ")}</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link href={`/admin/workspaces/${row.workspace_id}#${row.visit_reports || row.closure_reports ? "place-reports" : "session-hours-title"}`}>
            <ClipboardList aria-hidden="true" /> Review
          </Link></Button>
        </li>)}
      </ul>}
    {rows.length === 250 && <p className="text-sm text-muted-foreground">Showing the first 250 places in priority order.</p>}
  </PageContainer></PageShell>;
}
