import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT, ThemeSync } from "@/components/theme";

const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "SiteRadar", template: "%s · SiteRadar" },
  description: "Uptime, traffic, audits and subscriptions for all our websites.",
  icons: {
    icon: [{ url: "/favicon/favicon.ico", sizes: "any" }, { url: "/favicon/siteradar-favicon.svg", type: "image/svg+xml" }, { url: "/favicon/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/favicon/favicon-16.png", sizes: "16x16", type: "image/png" }],
    apple: "/favicon/apple-touch-icon-180.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${mono.variable} h-full antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full"><ThemeSync />{children}</body>
    </html>
  );
}
