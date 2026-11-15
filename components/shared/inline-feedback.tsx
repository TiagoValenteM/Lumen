import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function InlineFeedback({ children, id, error = false }: { children: ReactNode; id?: string; error?: boolean }) {
  return (
    <div id={id} role={error ? "alert" : "status"} className={cn(
      "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm [overflow-wrap:anywhere]",
      error ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
    )}>
      {error && <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
