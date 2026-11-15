"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** The small "is your website up?" box beside articles. Sends the address to the checker page, which fills it in and runs the check. */
export function CheckerCard() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) router.push(`/tools/uptime-checker?url=${encodeURIComponent(url.trim())}`); }}
      className="flex flex-col gap-3 rounded-2xl border border-[#EFE4D8] bg-white p-5">
      <h2 className="text-lg font-bold leading-snug">Is your website up right now?</h2>
      <p className="text-[15px] leading-relaxed text-[#475569]">Check any address for free: status, speed and SSL expiry.</p>
      <label htmlFor="cc-url" className="sr-only">Website address</label>
      <input id="cc-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
        className="min-h-11 w-full rounded-xl border border-[#CBD5E1] px-3.5 text-[15px] text-[#0F172A] placeholder:text-[#94A3B8]" />
      <button disabled={!url.trim()} className="min-h-11 rounded-xl bg-[#0F172A] px-4 text-[15px] font-semibold text-white hover:bg-[#1E293B] disabled:opacity-60">Check website</button>
    </form>
  );
}
