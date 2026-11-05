import { MktFooter, MktHeader } from "@/components/mkt";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FBF8F4] text-[#0F172A]">
      <MktHeader />
      <main className="flex-1">{children}</main>
      <MktFooter />
    </div>
  );
}
