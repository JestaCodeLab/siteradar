"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Search } from "lucide-react";
import { btn, Card, CardTitle, Empty, ErrorState, Skeleton, Tile } from "./ui";
import { useToast } from "./toast";
import { fetcher, send, type SearchStatus } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const path = (u: string) => { try { const x = new URL(u); return x.pathname === "/" ? "/" : x.pathname.replace(/\/$/, ""); } catch { return u; } };

const NOTICE: Record<string, [boolean, string, string?]> = {
  ok: [true, "Google Search Console is connected."],
  denied: [false, "Access was not given.", "Nothing was connected. You can try again when you are ready."],
  noproperty: [false, "Google is connected, but this website is not in your Search Console.", "Add and verify it at search.google.com/search-console with the same Google account, then press Refresh."],
  error: [false, "Could not finish connecting to Google.", "Please try again."],
};

/** How the website's pages do in Google search, from the owner's own Search Console (read-only), and which pages should get more clicks. */
export function SearchTab({ id }: { id: string }) {
  const { isAdmin } = useMe();
  const toast = useToast();
  const router = useRouter();
  const flag = useSearchParams().get("gsc");
  const { data, error, mutate } = useSWR<SearchStatus>(`/api/sites/${id}/search`, fetcher);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!flag || !NOTICE[flag]) return;
    const [ok, title, text] = NOTICE[flag];
    if (ok) toast.success(title); else toast.error(title, text);
    router.replace(`/websites/${id}?tab=search`, { scroll: false });
    mutate();
  }, [flag]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-72" />;

  async function connect() {
    setBusy("connect");
    try { const r = await send<{ url: string }>("POST", `/api/sites/${id}/search/connect`); window.location.href = r.url; return; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not start the connection."); }
    setBusy(null);
  }
  async function refresh() {
    setBusy("refresh");
    try { await send("POST", `/api/sites/${id}/search/refresh`); await mutate(); toast.success("Updated from Google."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not update."); }
    setBusy(null);
  }
  async function disconnect() {
    if (!confirm("Disconnect Google Search Console from this website? The saved search data is removed.")) return;
    setBusy("disconnect");
    try { await send("POST", `/api/sites/${id}/search/disconnect`); await mutate(); toast.success("Disconnected."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not disconnect."); }
    setBusy(null);
  }

  if (!data.configured) return <Card><Empty icon={Search} title="Search Console is not set up yet">Google sign-in has to be configured on this server before websites can connect.</Empty></Card>;

  if (!data.connected || data.error === "revoked") {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <CardTitle>See how this website does in Google</CardTitle>
        {data.error === "revoked" && <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-sm text-warn">Google access was removed or has expired. Connect again to keep the data coming.</p>}
        <p className="max-w-[640px] text-[15px] leading-relaxed text-ink-2">Connect Google Search Console to see how many times pages show in Google, how many clicks they get, where they rank, and which pages get fewer clicks than they should.</p>
        <ul className="flex max-w-[640px] list-disc flex-col gap-1.5 pl-5 text-sm text-ink-2">
          <li>Read-only. SiteRadar never changes anything in your Search Console.</li>
          <li>Use the Google account that has this website in Search Console.</li>
          <li>You can disconnect any time, which also removes the saved data.</li>
        </ul>
        <div>{isAdmin ? <button type="button" onClick={connect} disabled={busy !== null} className={btn.primary}>{busy === "connect" ? "Opening Google…" : "Connect Google Search Console"}</button>
          : <span className="text-sm text-muted">Ask an account admin to connect it.</span>}</div>
      </Card>
    );
  }

  const s = data.summary, opps = data.opportunities ?? [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{data.property ? <>Reading <b className="font-mono text-ink">{data.property.replace("sc-domain:", "")}</b> from Search Console</> : "Connected"}{data.fetched ? ` · updated ${fmtAgo(data.fetched)}` : ""}</span>
        {isAdmin && <span className="flex gap-2.5"><button type="button" onClick={refresh} disabled={busy !== null || !data.property} className={btn.secondary}>{busy === "refresh" ? "Updating…" : "Refresh"}</button>
          <button type="button" onClick={disconnect} disabled={busy !== null} className={btn.secondary}>Disconnect</button></span>}
      </div>

      {data.error === "no_property" || !data.property ? (
        <Card><Empty icon={Search} title="This website is not in your Search Console">Add and verify this website at search.google.com/search-console with the connected Google account, then press Refresh.</Empty></Card>
      ) : !s ? (
        <Card><Empty icon={Search} title="No data yet">Press Refresh to read the last 28 days from Google.</Empty></Card>
      ) : (
        <>
          <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <Tile label="Clicks from Google" value={s.clicks.toLocaleString()} note={`${data.start} to ${data.end}`} tone="muted" />
            <Tile label="Times shown in search" value={s.impressions.toLocaleString()} note={`${s.pages} pages`} tone="muted" />
            <Tile label="Click rate" value={pct(s.ctr)} note="Clicks divided by times shown" tone="muted" />
            <Tile label="Average position" value={s.position ? String(s.position) : "—"} note="Lower is higher up the page" tone="muted" />
          </section>

          <Card className="px-5 pb-2 pt-5">
            <CardTitle aside={`Pages on page one with at least ${data.min_impressions} views`}>Pages that should get more clicks</CardTitle>
            {opps.length === 0 && <p className="border-t border-line-soft py-4 text-sm text-muted">Nothing stands out. Either your pages already get the clicks you would expect for where they rank, or they do not have enough views yet to say.</p>}
            {opps.map((o) => (
              <div key={o.page} className="flex flex-col gap-1.5 border-t border-line-soft py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <a href={o.page} target="_blank" rel="noreferrer" className="min-w-0 break-all font-mono text-[14px] font-semibold text-brand hover:underline">{path(o.page)}</a>
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand-ink">about {o.missed_clicks.toLocaleString()} more clicks a month</span>
                </div>
                <span className="text-sm text-ink-2">Position {o.position} · shown {o.impressions.toLocaleString()} times · {o.clicks.toLocaleString()} clicks · {pct(o.ctr)} click rate, where about {pct(o.expected_ctr)} is typical</span>
                {o.queries.length > 0 && <span className="text-[13px] text-muted">People find it by searching: {o.queries.slice(0, 3).map((q) => `“${q.query}”`).join(", ")}</span>}
              </div>
            ))}
            <p className="border-t border-line-soft py-3 text-xs text-muted">The typical click rates are rough industry figures, and the extra clicks are an estimate, not a promise. A clearer title or description can help, but rankings and seasons also move the numbers.</p>
          </Card>
        </>
      )}
    </div>
  );
}
