import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer, PageShell } from "@/components/shared/lumen-page";

export function AuthFormLayout({ title, switchLabel, switchLink, switchHref, children }: {
  title: string;
  switchLabel: string;
  switchLink: string;
  switchHref: string;
  children: ReactNode;
}) {
  return (
    <PageShell className="min-h-full">
      <PageContainer className="max-w-md gap-5 py-7 sm:py-12">
        <header className="space-y-2 border-b border-border/60 pb-4">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{switchLabel} <Link href={switchHref} className="keyboard-focus font-medium text-foreground underline underline-offset-4">{switchLink}</Link></p>
        </header>
        {children}
        <p className="text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="keyboard-focus underline underline-offset-4">Terms</Link>{" "}and{" "}
          <Link href="/legal/privacy" className="keyboard-focus underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </PageContainer>
    </PageShell>
  );
}
