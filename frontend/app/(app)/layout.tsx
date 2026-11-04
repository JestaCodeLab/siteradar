import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10 lg:pb-12">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7">{children}</div>
      </main>
    </div>
  );
}
