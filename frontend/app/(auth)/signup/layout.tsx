import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Create your account",
  description: "Create a SiteRadar account and put your first website on the radar in minutes. Uptime, SSL, domain and DNS monitoring with instant alerts.",
  path: "/signup",
});

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
