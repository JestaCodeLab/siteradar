import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT, ThemeSync } from "@/components/theme";
import { InitialLoader } from "@/components/page-loader";
import { SessionGuard } from "@/components/session-guard";
import { ToastProvider } from "@/components/toast";
import { DEFAULT_DESCRIPTION, DEFAULT_OG, SITE_NAME, SITE_URL } from "@/lib/seo";

const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: "SiteRadar · Website monitoring", template: "%s · SiteRadar" },
  description: DEFAULT_DESCRIPTION,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GH", images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: SITE_NAME }] },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG] },
  icons: {
    icon: [{ url: "/favicon/favicon.ico", sizes: "any" }, { url: "/favicon/favicon-16.png", sizes: "16x16", type: "image/png" }, { url: "/favicon/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/favicon/favicon-64.png", sizes: "64x64", type: "image/png" }],
    apple: "/favicon/apple-touch-icon-180.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SiteRadar", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#F97316" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${mono.variable} h-full antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full"><InitialLoader /><ThemeSync /><ToastProvider>{children}<SessionGuard /></ToastProvider></body>
    </html>
  );
}
