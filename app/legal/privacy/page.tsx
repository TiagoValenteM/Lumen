import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const updatedAt = "June 5, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>Last updated {updatedAt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <Section title="What we collect">
              Lumen stores account information such as your email, profile name, tag, avatar, bio, and account role. We also store product activity you choose to create, including saved workspaces, visited workspaces, submitted places, reviews, ratings, uploaded photos, and suggested corrections.
            </Section>

            <Section title="Location data">
              If you use location-based features, your browser may ask for permission to share your approximate position. Lumen uses that location to show nearby workspaces and may request reverse-geocoding results from a mapping provider. You can deny or revoke location permission in your browser.
            </Section>

            <Section title="Workspace and moderation data">
              Workspace submissions may include names, addresses, coordinates, photos, amenities, notes, and moderation status. Admins can review submissions, edit location details, approve or reject content, merge cities, and remove unused city records.
            </Section>

            <Section title="How we use data">
              We use data to operate your account, personalize the signed-in homepage, show saved and visited places, review submitted content, improve discovery quality, and protect the service from spam or misuse.
            </Section>

            <Section title="Sharing and processors">
              We do not sell personal data. Lumen uses service providers such as Supabase for authentication, database, and file storage. Location search or reverse-geocoding features may contact external mapping/geocoding services depending on configuration.
            </Section>

            <Section title="Your choices">
              You can update your profile, remove saved or visited places, and contact us to request access or deletion of your account data. Some public contributions may be retained or anonymized when needed to preserve directory integrity.
            </Section>

            <Section title="Contact">
              For privacy questions, contact{" "}
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
