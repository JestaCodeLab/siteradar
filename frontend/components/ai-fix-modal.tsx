"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { ExternalLink, Sparkles, X } from "lucide-react";
import { btn } from "./ui";
import { useToast } from "./toast";
import { useAiGate } from "./ai-topup";
import { fetcher, send, type AiEdit, type AiTargets, type Issue } from "@/lib/api";

export const AI_RULES = ["desc_missing", "desc_length", "title_missing", "title_length", "title_duplicate", "img_alt"];
const LIMIT: Record<string, number> = { desc: 160, title: 60 };
const path = (u: string) => { try { const x = new URL(u); return (x.pathname === "/" ? "/" : x.pathname.replace(/\/$/, "")) + x.search; } catch { return u; } };

/**
 * Fix with AI: the pages a finding affects. For each one the person asks for a draft (one credit), edits it, and approves it;
 * the SiteRadar plugin then applies it on the website. Nothing is applied without approval, and an applied change can be undone.
 */
export function AiFixModal({ siteId, issue, host, onClose }: { siteId: string; issue: Issue; host: string; onClose: () => void }) {
  const { gate, modal } = useAiGate();
  const key = `/api/sites/${siteId}/ai/${issue.rule}`;
  const { data, error, mutate } = useSWR<AiTargets>(key, fetcher, { refreshInterval: (d) => (d?.pages.some((p) => p.item && ["approved", "reverting"].includes(p.item.status)) ? 4000 : 0) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !modal) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, modal]);

  const refresh = async () => { await Promise.all([mutate(), globalMutate("/api/ai/credits")]); };
  const noun = data?.label ?? "text";

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="aifix-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4">
      <div className="flex max-h-[92vh] w-[min(720px,100%)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Sparkles aria-hidden="true" size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="aifix-title" className="text-xl font-bold">Fix with AI on <span className="text-brand">{host}</span></h2>
            <p className="mt-0.5 text-[15px] text-muted">{issue.title}. AI writes a draft for each page, you review it, and the plugin applies it once you approve. Each draft uses one AI credit{data ? `, and you have ${data.credits.left.toLocaleString()} left` : ""}.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft"><X aria-hidden="true" size={18} /></button>
        </div>

        {error && <p className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error.message}</p>}
        {!data && !error && <p className="py-6 text-center text-sm text-muted">Loading…</p>}
        {data && data.pages.length === 0 && <p className="rounded-lg bg-soft px-3.5 py-3 text-sm text-ink-2">The latest audit did not list the pages for this finding. Run a new audit and try again.</p>}
        {data && data.count > data.pages.length && data.pages.length > 0 && <p className="text-[13px] text-muted">Showing {data.pages.length} of {data.count} pages. Fix these, run a new audit, and the next ones appear.</p>}

        <ul className="flex flex-col gap-3">
          {data?.pages.map((p) => <PageRow key={p.url + (p.item?.id ?? "")} siteId={siteId} rule={issue.rule} noun={noun} page={p} gate={gate} refresh={refresh} />)}
        </ul>
        <div className="flex justify-end"><button type="button" onClick={onClose} className={btn.secondary}>Close</button></div>
      </div>
      {modal}
    </div>
  );
}

function PageRow({ siteId, rule, noun, page, gate, refresh }: { siteId: string; rule: string; noun: string; page: AiTargets["pages"][number]; gate: (a: () => void) => void; refresh: () => Promise<void> }) {
  const toast = useToast();
  const item: AiEdit | null = page.item;
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState(item?.text ?? "");
  const [alts, setAlts] = useState(item?.alts ?? []);
  const live = item && !["skipped", "reverted"].includes(item.status) ? item : null;
  const field = item?.field ?? (rule.startsWith("desc") ? "desc" : rule.startsWith("title") ? "title" : "alt");

  async function call(label: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(label);
    try { await fn(); await refresh(); if (ok) toast.success(ok); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong."); await refresh(); }
    setBusy(null);
  }
  const base = `/api/sites/${siteId}/ai`;
  const write = () => gate(() => call("draft", async () => { const r = await send<{ item: AiEdit }>("POST", `${base}/${rule}/draft`, { url: page.url }); setText(r.item.text ?? ""); setAlts(r.item.alts ?? []); }));
  const approve = () => call("approve", async () => {
    if (!live) return;
    await send("PATCH", `${base}/items/${live.id}`, field === "alt" ? { alts } : { text });
    await send("POST", `${base}/items/${live.id}/approve`);
  }, "Approved. The plugin applies it within a few seconds.");

  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <a href={page.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all font-mono text-[13px] text-brand hover:underline">{path(page.url)}<ExternalLink size={12} aria-hidden="true" /></a>
          {page.detail && <span className="text-[13px] text-muted">{page.detail}</span>}
        </span>
        {live?.status === "applied" && <span className="rounded-full bg-ok px-2.5 py-1 text-xs font-semibold text-white">Applied</span>}
        {live?.status === "approved" && <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">Applying…</span>}
        {live?.status === "reverting" && <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">Undoing…</span>}
      </div>

      {!live && <div><button type="button" onClick={write} disabled={busy !== null} className={btn.primary}><Sparkles size={15} aria-hidden="true" />{busy === "draft" ? "Writing…" : "Write a draft"}</button></div>}

      {live?.status === "draft" || live?.status === "failed" ? (
        <div className="flex flex-col gap-2.5">
          {live.status === "failed" && <p className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">The plugin could not apply it: {live.error || "unknown reason"}</p>}
          {field === "alt" ? (
            <ul className="flex flex-col gap-2">
              {alts.map((a, i) => (
                <li key={a.src} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.src} alt="" className="size-14 shrink-0 rounded-lg border border-line object-cover" />
                  <input value={a.alt} maxLength={200} onChange={(e) => setAlts(alts.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} aria-label={`Alt text for image ${i + 1}`} className="min-h-11 w-full min-w-0 rounded-lg border border-[#c9cfd8] px-3 text-sm" />
                </li>))}
            </ul>
          ) : (
            <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-2">New {noun}
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={field === "desc" ? 3 : 2} className="w-full rounded-lg border border-[#c9cfd8] px-3 py-2.5 text-sm font-normal text-ink" />
              <span className={`text-xs font-normal ${text.length > LIMIT[field] ? "text-warn" : "text-muted"}`}>{text.length} characters. Aim for {field === "desc" ? "120 to 160" : "30 to 60"}.</span>
            </label>
          )}
          {item && item.current && field !== "alt" && <p className="text-[13px] text-muted">Now: {item.current}</p>}
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={approve} disabled={busy !== null || (field === "alt" ? !alts.some((a) => a.alt.trim()) : !text.trim())} className={btn.primary}>{busy === "approve" ? "Approving…" : "Approve and apply"}</button>
            <button type="button" onClick={() => live && call("skip", () => send("POST", `${base}/items/${live.id}/skip`))} disabled={busy !== null} className={btn.secondary}>Skip this page</button>
          </div>
        </div>
      ) : null}

      {live?.status === "applied" && (
        <div className="flex flex-col gap-1.5 text-[13px] text-ink-2">
          {field === "alt" ? <span>Alt text added to {live.alts?.filter((a) => a.alt).length ?? 0} image(s).</span> : <span>{live.text}</span>}
          <button type="button" onClick={() => call("undo", () => send("POST", `${base}/items/${live.id}/undo`), "Undo requested. The plugin takes it off within a few seconds.")} disabled={busy !== null} className="min-h-9 self-start text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">Undo</button>
        </div>
      )}
    </li>
  );
}
