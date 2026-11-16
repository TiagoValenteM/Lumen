import Link from "next/link";
import type { ReactNode } from "react";

export const legalLinkClass = "text-primary underline underline-offset-4";

const pages = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/contact", label: "Contact" },
];

export function LegalPage({ title, summary, children }: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Legal and support" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
        {pages.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={label === title ? "page" : undefined}
            className={label === title ? "font-semibold text-foreground" : legalLinkClass}>
            {label}
          </Link>
        ))}
      </nav>
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="leading-relaxed text-muted-foreground">{summary}</p>
        </header>
        <div className="space-y-7 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
