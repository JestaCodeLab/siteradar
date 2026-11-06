import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Log in", description: "Log in to your SiteRadar account to see how your websites are doing.", path: "/login" });

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
