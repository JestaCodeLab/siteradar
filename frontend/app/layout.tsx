import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT, ThemeSync } from "@/components/theme";

const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "SiteRadar", template: "%s · SiteRadar" },
  description: "Uptime, traffic, audits and subscriptions for all our websites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${mono.variable} h-full antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full"><ThemeSync />{children}</body>
    </html>
  );
}
