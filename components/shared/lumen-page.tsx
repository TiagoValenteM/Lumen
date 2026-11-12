import Link from "next/link";
import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
};

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

type FeedbackStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
};

type LoadingStateProps = {
  label?: string;
  className?: string;
};

type AccessRestrictedProps = {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  icon?: LucideIcon;
};

type MetricButtonProps = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  iconClassName?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

type SectionPanelProps = React.ComponentProps<typeof Card>;

export function PageShell({ children, className }: PageShellProps) {
  return <main className={cn("min-h-screen bg-background", className)}>{children}</main>;
}

export function PageContainer({ children, className, size = "lg" }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:py-10",
        size === "md" && "max-w-4xl",
        size === "lg" && "max-w-6xl",
        size === "xl" && "max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionPanel({ className, ...props }: SectionPanelProps) {
  return <Card className={cn("border-border/40 bg-card/90 shadow-sm shadow-black/5", className)} {...props} />;
}

export function FeedbackState({ title, description, icon: Icon, action, className }: FeedbackStateProps) {
  return (
    <div className={cn("flex min-h-[180px] items-center justify-center rounded-xl border border-border/40 bg-card/70 p-6 text-center", className)}>
      <div className="flex max-w-sm flex-col items-center gap-3">
        {Icon && (
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </div>
        )}
        <div>
          {title && <p className="font-medium">{title}</p>}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading...", className }: LoadingStateProps) {
  return (
    <PageShell className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>{label}</span>
      </div>
    </PageShell>
  );
}

export function AccessRestricted({
  title = "Access restricted",
  description = "You do not have permission to view this page.",
  backHref = "/profile",
  backLabel = "Back to profile",
  icon: Icon,
}: AccessRestrictedProps) {
  return (
    <PageShell className="flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {Icon && <Icon className="size-5 text-destructive" />}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function MetricButton({ label, value, icon: Icon, iconClassName, active, onClick, className }: MetricButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-left shadow-sm transition-colors",
        active
          ? "border-primary/35 bg-primary/10 shadow-black/5"
          : "border-border/40 bg-card/70 hover:border-primary/25 hover:bg-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {Icon && <Icon className={cn("size-4 text-muted-foreground", iconClassName)} />}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </button>
  );
}
