import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, legalLinkClass } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Contact | Lumen",
  description: "Contact Lumen for account help, privacy requests or reports about a listing.",
};

const contactEmail = "tiagovlnt@proton.me";

export default function ContactPage() {
  return (
    <LegalPage title="Contact" summary="Get help with your account, report a problem or make a privacy request.">
      <LegalSection title="Email Lumen">
        <p><a href={`mailto:${contactEmail}`} className={`${legalLinkClass} break-all`}>{contactEmail}</a></p>
      </LegalSection>
      <LegalSection title="Correct a place listing">
        <p>For a wrong address, outdated hours or an amenity that has changed, <Link href="/cities" className={legalLinkClass}>find the place in the directory</Link>, sign in and choose <strong>Suggest an Edit</strong> on its page. To report a photo, review or other content privately, email us with a link to the page.</p>
      </LegalSection>
      <LegalSection title="Account help and privacy requests">
        <p>For account help or requests to access, correct or delete your data, email us from your account address if possible. Never send your password, verification codes or identity documents in the first message.</p>
      </LegalSection>
    </LegalPage>
  );
}
