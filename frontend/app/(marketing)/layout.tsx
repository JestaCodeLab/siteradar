import { MktFooter, MktHeader } from "@/components/mkt";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <MktHeader />
      <main className="flex-1">{children}</main>
      <MktFooter />
    </div>
  );
}
