"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>How we handle your data on Lumen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              We collect basic account details (name, email, profile tag) to operate your account and display
              contributions like reviews. We also store optional profile content you provide (avatar, bio).
            </p>
            <p>
              <strong>Storage:</strong> Uploaded avatars are stored in our secure storage bucket. Do not upload
              sensitive or inappropriate content.
            </p>
            <p>
              <strong>Analytics:</strong> We may use limited analytics to improve the product. We do not sell your
              personal data.
            </p>
            <p>
              <strong>Access & Deletion:</strong> You can request a copy or deletion of your data at any time.
              Contact us below and we will respond promptly.
            </p>
            <p>
              For privacy questions, contact{" "}
              <Link href="mailto:support@lumen.com" className="text-primary underline">
                support@lumen.com
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
