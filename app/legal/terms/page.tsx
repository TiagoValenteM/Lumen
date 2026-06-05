import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const updatedAt = "June 5, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <CardDescription>Last updated {updatedAt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <Section title="Using Lumen">
              Lumen helps people discover and evaluate work-friendly places such as cafes, coworking spaces, libraries, restaurants, and hotel lobbies. You may browse public city and workspace pages without an account. Some features, including saving places, marking visits, submitting places, writing reviews, and suggesting corrections, require an account.
            </Section>

            <Section title="Accounts">
              You are responsible for the information you provide, your account activity, and keeping your login credentials secure. Do not impersonate another person, create accounts for abusive use, or attempt to access admin-only areas without permission.
            </Section>

            <Section title="Workspace submissions and corrections">
              If you submit a workspace, upload photos, or suggest edits, you agree that the information is accurate to the best of your knowledge and that you have the right to share it. Lumen may review, edit, approve, reject, merge, or remove submitted content to keep the directory useful and trustworthy.
            </Section>

            <Section title="Reviews and community content">
              Reviews, ratings, photos, and comments should be respectful, relevant, and based on real experience. Do not submit unlawful, misleading, hateful, private, or infringing content. We may remove content or restrict access when content harms the quality or safety of the service.
            </Section>

            <Section title="Location and place information">
              Workspace details, coordinates, addresses, opening details, amenities, and workability scores may be incomplete or change over time. Always verify important details directly with the venue before relying on them.
            </Section>

            <Section title="Availability and changes">
              We aim to keep Lumen reliable, but we do not guarantee uninterrupted access or error-free data. We may change, suspend, or discontinue parts of the service as the product evolves.
            </Section>

            <Section title="Contact">
              Questions about these terms can be sent to{" "}
              <Link href="mailto:support@lumen.com" className="text-primary underline">
                support@lumen.com
              </Link>
              .
            </Section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
