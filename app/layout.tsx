import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/features/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { BRAND_NAME } from "@/lib/constants/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} | Work-friendly places`,
  description: "Discover the best cities and workspaces for digital nomads and remote workers",
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
