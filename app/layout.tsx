import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/features/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_OPEN_GRAPH, getSiteOrigin } from "@/lib/constants/brand";

export const metadata: Metadata = {
  metadataBase: getSiteOrigin(process.env),
  applicationName: BRAND_NAME,
  title: {
    default: `${BRAND_NAME} | Work-friendly places`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  openGraph: BRAND_OPEN_GRAPH,
  twitter: { card: "summary_large_image" },
  robots: process.env.VERCEL_ENV === "preview" ? { index: false, follow: false } : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <a href="#root-content" className="skip-link keyboard-focus">Skip to content</a>
            <NavBar />
            <div id="root-content" tabIndex={-1}>
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
