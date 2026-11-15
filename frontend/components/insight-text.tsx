import Link from "next/link";
import { Fragment } from "react";

/** Text with [links](/path), **bold** and `code`, from the plain strings in lib/insights.ts. */
export function InsightText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) return <Link key={i} href={link[2]} className="font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#7C2D12]">{link[1]}</Link>;
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i} className="font-bold text-[#0F172A]">{bold[1]}</strong>;
        const code = part.match(/^`([^`]+)`$/);
        if (code) return <code key={i} className="block overflow-x-auto rounded-lg bg-[#0F172A] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#E2E8F0]">{code[1]}</code>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
