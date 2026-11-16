import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, legalLinkClass } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Lumen",
  description: "What Lumen processes when you browse, use location features or contribute to the directory.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" summary="What Lumen processes, what other people can see, and how to make a privacy request.">
      <LegalSection title="Accounts and contributions">
        <p>We use your email and account details to sign you in and manage your account. If you use them, we store profile details, saved places and visits, as well as the places, reviews, photos and corrections you submit.</p>
        <p>Approved listings and photos, published reviews, and profile details shown alongside your public activity can be visible to anyone. Your account email, saves and visits are not displayed in the public directory. Reviewers can see submissions and corrections while handling them.</p>
        <p>When you upload a photo, the file is sent to storage before you submit the place. Anyone with a direct photo URL may be able to open it, even if it is not yet shown in the directory. Do not upload images you need to keep private.</p>
      </LegalSection>
      <LegalSection title="Maps, location and address search">
        <p>When you grant location permission, Find a Spot uses your device position in your browser to calculate distances and does not save those coordinates. Your browser requests tiles for the area on screen from OpenFreeMap. When you search for an address or look up a pin, the query or pin coordinates go to a geocoding provider, such as Geoapify, LocationIQ, Photon or Nominatim, depending on configuration and availability. The venue address and map pin are part of a submitted listing.</p>
      </LegalSection>
      <LegalSection title="Optional AI and moderation">
        <p>Find a Spot handles common requests in your browser. Where available, Try with AI sends the text you enter to OpenRouter only when you choose that option. Lumen does not attach your account details or device coordinates to that request or save the text; it keeps a count linked to your account to enforce usage limits. Do not include personal information in your request.</p>
        <p>When AI assistance is used for moderation, OpenRouter receives venue details such as the name, address, business contact information and listing descriptions to suggest improvements. A reviewer decides whether to use those suggestions.</p>
      </LegalSection>
      <LegalSection title="Cookies and browser storage">
        <p>We use session cookies to keep you signed in. Browser storage can remember your appearance preference and keep an unfinished place or review draft on the same browser. Clearing site data removes local drafts and preferences, not records already submitted to Lumen.</p>
      </LegalSection>
      <LegalSection title="Service providers">
        <p>Vercel hosts Lumen. Supabase provides authentication, the database and file storage. The mapping, address lookup and AI providers above receive the data needed to answer those requests. We do not sell personal data.</p>
      </LegalSection>
      <LegalSection title="Your choices and requests">
        <p>You can edit your profile, remove saved places and visits, and change location permission in your browser. To ask for access, correction or deletion, or to raise a privacy concern, use the private email on the <Link href="/legal/contact" className={legalLinkClass}>Contact page</Link>. We may need to verify that a request relates to your account.</p>
      </LegalSection>
    </LegalPage>
  );
}
