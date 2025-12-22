"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <CardDescription>Our standard terms for using Lumen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Welcome to Lumen. By accessing or using our platform, you agree to these terms. If you do
              not agree, please refrain from using the service.
            </p>
            <p>
              <strong>Use of Service:</strong> You may browse, rate, and review workspaces. You are responsible
              for the content you submit and must ensure it is accurate and respectful.
            </p>
            <p>
              <strong>Accounts:</strong> You must provide accurate information. You are responsible for maintaining
              the confidentiality of your account and credentials.
            </p>
            <p>
              <strong>Content:</strong> Reviews and uploads must comply with applicable laws and respect the rights of
              others. We may remove content that violates our guidelines.
            </p>
            <p>
              <strong>Availability:</strong> We aim for high availability but do not guarantee uninterrupted service.
            </p>
            <p>
              <strong>Changes:</strong> We may update these terms from time to time. Continued use constitutes
              acceptance of the updated terms.
            </p>
            <p>
              For questions, contact us at{" "}
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
