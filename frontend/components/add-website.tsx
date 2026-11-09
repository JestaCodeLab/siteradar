"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { mutate } from "swr";
import { Globe, X } from "lucide-react";
import { btn, input } from "./ui";
import { useToast } from "./toast";
import { ApiError, send, type SiteCard } from "@/lib/api";
import { splitEmails } from "@/lib/format";
import { useMe } from "@/lib/me";

const NEXT: Record<string, string> = { freelance: "Starter", starter: "Growth", growth: "Scale" };
const AddWebsiteContext = createContext<{ open: () => void } | null>(null);

/** Lets any page open the Add website dialog: const { open } = useAddWebsite(). */
export function useAddWebsite() {
  const ctx = useContext(AddWebsiteContext);
  if (!ctx) throw new Error("useAddWebsite must be used inside <AddWebsiteProvider>");
  return ctx;
}

export function AddWebsiteProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  const open = useCallback(() => setShow(true), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <AddWebsiteContext.Provider value={value}>
      {children}
      {show && <AddWebsiteDialog onClose={() => setShow(false)} />}
    </AddWebsiteContext.Provider>
  );
}

function AddWebsiteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { ws, canWrite, isAdmin, mutate: refreshMe } = useMe();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<{ text: string; limit: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const used = ws?.usage.sites ?? 0, limit = ws?.plan.sites ?? 1;
  const atLimit = !!ws && used >= limit;
  const locked = atLimit || !canWrite;
  const next = NEXT[ws?.plan_id ?? ""];

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const site = await send<SiteCard>("POST", "/api/sites", {
        name: f.get("name"), url: f.get("url"), keyword: f.get("keyword"), report_to: splitEmails(f.get("report_to")),
      });
      await Promise.all([mutate("/api/sites"), refreshMe()]);
      toast.success("Website added.", "SiteRadar has started checking it.");
      onClose();
      router.push(`/websites/${site.id}`);
    } catch (err) {
      setError({ text: err instanceof Error ? err.message : "Could not add the website.", limit: err instanceof ApiError && err.code === "limit" });
      setBusy(false);
    }
  }

  const label = "text-sm font-medium";
  return (
    <dialog
      ref={dialog} aria-labelledby="aw-title" onClose={onClose}
      className="m-auto w-[min(540px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop:bg-[#0F172A]/60"
    >
      <form onSubmit={submit} className="flex max-h-[calc(100vh-32px)] flex-col">
        <div className="flex items-start gap-3.5 p-6 pb-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Globe aria-hidden="true" size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="aw-title" className="text-xl font-bold">Add a website</h2>
            <p className="mt-0.5 text-[15px] text-muted">SiteRadar starts checking it right away and takes a picture of the homepage.</p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink"><X aria-hidden="true" size={18} /></button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 pb-2 pt-2">
          {atLimit && (
            <div role="status" className="flex flex-col gap-2 rounded-xl bg-warn-soft px-4 py-3.5 text-sm text-warn">
              <b>You have reached your website limit</b>
              <span>The {ws?.plan.name} plan includes {limit} website{limit === 1 ? "" : "s"} and you are using {used}.{next ? ` Upgrade to ${next} for more,` : ""} or remove a website you no longer need.</span>
              {isAdmin && next && <Link href="/settings?tab=billing" onClick={() => dialog.current?.close()} className="font-semibold underline">Upgrade to {next}</Link>}
            </div>
          )}
          {!canWrite && <p className="rounded-xl bg-line-soft px-4 py-3 text-sm">You have view-only access, so you can&apos;t add websites.</p>}
          <div className="flex flex-col gap-2"><label htmlFor="aw-name" className={label}>Name</label><input id="aw-name" name="name" required disabled={locked} autoFocus placeholder="Acme Ltd" className={input} /></div>
          <div className="flex flex-col gap-2"><label htmlFor="aw-url" className={label}>Address</label><input id="aw-url" name="url" required disabled={locked} placeholder="https://www.example.com" className={input} /></div>
          <div className="flex flex-col gap-2"><label htmlFor="aw-kw" className={label}>Text the page must contain <span className="font-normal text-muted">(optional, catches blank pages)</span></label><input id="aw-kw" name="keyword" disabled={locked} className={input} /></div>
          <div className="flex flex-col gap-2"><label htmlFor="aw-rep" className={label}>Send the monthly report to <span className="font-normal text-muted">(separate emails with commas)</span></label><input id="aw-rep" name="report_to" disabled={locked} placeholder="client@example.com" className={input} /></div>
          {error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error.text} {error.limit && <Link href="/settings?tab=billing" onClick={() => dialog.current?.close()} className="font-semibold underline">See plans</Link>}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pt-4">
          <span className="text-[13px] text-muted">{used} of {limit} website{limit === 1 ? "" : "s"} used on your plan</span>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => dialog.current?.close()} className={btn.secondary}>Cancel</button>
            <button disabled={locked || busy} className={btn.primary}>{busy ? "Adding…" : "Add website"}</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

/** A button that opens the dialog. Pass the look through className, e.g. btn.primary. */
export function AddWebsiteButton({ className, children = "Add website" }: { className?: string; children?: ReactNode }) {
  const { open } = useAddWebsite();
  return <button type="button" onClick={open} className={className}>{children}</button>;
}
