"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { FEATURE_GROUPS, featureHref } from "@/lib/features";
import { FEATURE_MENU, SOLUTION_MENU, type MenuGroup, type MenuItem } from "@/lib/menus";

const BARS = Array.from({ length: 30 }, (_, i) => i);

/** The small example card for a feature. The numbers are illustrations. */
function Example({ f }: { f: MenuItem }) {
  const p = f.preview;
  return (
    <div className="overflow-hidden rounded-xl border border-[#EFE4D8] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#EFE4D8] px-4 py-2.5 font-mono text-[13px] text-[#475569]">
        <span className="truncate">{p.label}</span>
        {p.chip && <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 font-sans text-xs font-bold text-[#166534]">{p.chip}</span>}
      </div>
      <div className="flex flex-col gap-2 px-4 py-4">
        <span className="text-[34px] font-bold leading-none tracking-[-0.03em] text-[#0F172A]">{p.big}</span>
        <span className="text-sm leading-snug text-[#475569]">{p.caption}</span>
        {p.bars && (
          <div aria-hidden="true" className="mt-2 flex h-9 items-stretch gap-[3px]">
            {BARS.map((i) => <span key={i} className={`flex-1 rounded-[2px] ${i === 19 ? "bg-[#F97316]" : "bg-[#16A34A]"}`} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/** The wide panel under the navbar: grouped links on the left, and a preview of whichever entry is hovered or focused on the right. */
function MegaPanel({ groups, onNavigate, cta, id, narrowLinks = false }: { groups: MenuGroup[]; onNavigate: () => void; cta: string; id: string; narrowLinks?: boolean }) {
  const all = groups.flatMap((g) => g.items);
  const [active, setActive] = useState(all[0].id);
  const item = all.find((f) => f.id === active) ?? all[0];
  const columns = groups.length > 2 ? [groups.slice(0, 2), groups.slice(2)] : [groups];
  return (
    <div id={id} className={`grid overflow-hidden rounded-2xl border border-[#EFE4D8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] ${narrowLinks ? "lg:grid-cols-[300px_1fr]" : "lg:grid-cols-[1.55fr_1fr]"}`}>
      <div className={`grid gap-x-8 gap-y-6 p-6 ${columns.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {columns.map((cols, c) => (
          <div key={c} className="flex flex-col gap-6">
            {cols.map((g) => (
              <div key={g.title} className="flex flex-col gap-1">
                <span className="px-3 pb-1 text-sm text-[#64748B]">{g.title}</span>
                {g.items.map((f) => (
                  <Link key={f.id} href={f.href} onClick={onNavigate} onMouseEnter={() => setActive(f.id)} onFocus={() => setActive(f.id)}
                    className={`rounded-lg px-3 py-2 text-[15px] font-medium text-[#0F172A] hover:bg-[#FFF7ED] ${f.id === active ? "bg-[#FFF7ED]" : ""}`}>{f.name}</Link>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hidden flex-col gap-4 border-l border-[#EFE4D8] bg-[#FFF7ED] p-7 lg:flex">
        <h3 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A]">{item.name}</h3>
        <p className="text-[15px] leading-relaxed text-[#475569]">{item.blurb}</p>
        <Example f={item} />
        <Link href={item.href} onClick={onNavigate} className="mt-auto inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-[#C2410C] hover:text-[#7C2D12]">
          {cta} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export const FeaturesPanel = ({ onNavigate }: { onNavigate: () => void }) => <MegaPanel id="features-menu" groups={FEATURE_MENU} onNavigate={onNavigate} cta="See how it works" />;
export const SolutionsPanel = ({ onNavigate }: { onNavigate: () => void }) => <MegaPanel id="solutions-menu" groups={SOLUTION_MENU} onNavigate={onNavigate} cta="Learn more" narrowLinks />;

/** The same links as a collapsible list for the phone menu. */
export function FeaturesMobile({ onNavigate }: { onNavigate: () => void }) {
  return (
    <details className="group border-b border-[#F1E8DD] py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold marker:hidden [&::-webkit-details-marker]:hidden">
        Features<ChevronDown size={20} aria-hidden="true" className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 pt-3">
        {FEATURE_GROUPS.map((g) => (
          <div key={g.title} className="flex flex-col">
            <span className="pb-1 text-sm text-[#64748B]">{g.title}</span>
            {g.items.map((f) => <Link key={f.slug} href={featureHref(f)} onClick={onNavigate} className="py-2.5 text-base font-medium">{f.name}</Link>)}
          </div>
        ))}
      </div>
    </details>
  );
}
