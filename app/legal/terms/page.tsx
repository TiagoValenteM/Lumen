import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, legalLinkClass } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Lumen",
  description: "The terms for browsing and contributing to the Lumen workspace directory.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" summary="The rules for using Lumen and contributing to the workspace directory.">
      <LegalSection title="Using the directory">
        <p>Lumen helps you find places to work. You can browse without an account. Saving places, recording visits, submitting places, writing reviews and suggesting edits require an account.</p>
        <p>Opening hours, prices, Wi-Fi, accessibility and laptop policies can change. Check with the venue before you travel or plan a work session. Lumen does not operate the venues or guarantee access.</p>
      </LegalSection>
      <LegalSection title="Your account">
        <p>Keep your sign-in details private. Do not impersonate someone else, access an account or private area without permission, or use the service to spam, harass or mislead people.</p>
      </LegalSection>
      <LegalSection title="What you contribute">
        <p>Share accurate information and write reviews based on your own experience. Only upload photos or text you have permission to share. Do not post private information about other people or content that is unlawful, abusive or infringes their rights.</p>
        <p>You retain any rights you have in your contributions. By submitting them, you give Lumen permission to store, review, edit and display them as needed to run the directory.</p>
      </LegalSection>
      <LegalSection title="Moderation and corrections">
        <p>Lumen can correct, merge, decline or remove listings and contributions, and restrict accounts that misuse the service. AI may assist reviewers, but it does not approve listings. To flag an error or report content, see <Link href="/legal/contact" className={legalLinkClass}>Contact</Link>.</p>
      </LegalSection>
      <LegalSection title="Changes and availability">
        <p>Lumen may update or discontinue features and cannot promise uninterrupted access. These terms do not limit rights that applicable law gives you. For how we handle your data, see the <Link href="/legal/privacy" className={legalLinkClass}>Privacy Policy</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
