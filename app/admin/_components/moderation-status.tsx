import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const tones = {
  neutral: "border-border/60 bg-muted text-muted-foreground",
  attention: "border-primary/20 bg-primary/10 text-primary",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
} as const;

export function ModerationStatus({ label, tone = "neutral", busy = false }: {
  label: string;
  tone?: keyof typeof tones;
  busy?: boolean;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 shadow-none", tones[tone])}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-current", busy && "motion-safe:animate-pulse")} />
      {label}
    </Badge>
  );
}
