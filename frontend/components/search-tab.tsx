"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { btn, Card, CardTitle } from "./ui";
import { HBar } from "./charts";
import { useToast } from "./toast";
import { SearchOverview } from "./search-chart";
import { fetcher, send, type AnalyticsResponse, type SearchRow, type SearchStatus } from "@/lib/api";
import { countryName } from "@/lib/countries";
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

/** Shows the result of coming back from Google, once, then clears it from the address. */
function useGscNotice(id: string, done: () => void) {
  const toast = useToast();
  const router = useRouter();
  const flag = useSearchParams().get("gsc");
  useEffect(() => {
    if (!flag || !NOTICE[flag]) return;
    const [ok, title, text] = NOTICE[flag];
    if (ok) toast.success(title); else toast.error(title, text);
    router.replace(`/websites/${id}?tab=analytics`, { scroll: false });
    done();
  }, [flag]); // eslint-disable-line react-hooks/exhaustive-deps
}

async function startConnect(id: string) {
  const r = await send<{ url: string }>("POST", `/api/sites/${id}/search/connect`, { tab: "analytics" });
  window.location.href = r.url;
}

function ConnectButton({ id, className = btn.primary }: { id: string; className?: string }) {
  const { isAdmin } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return <span className="text-sm text-muted">Ask an account admin to connect it.</span>;
  return (
    <button type="button" disabled={busy} className={className}
      onClick={async () => { setBusy(true); try { await startConnect(id); return; } catch (e) { toast.error(e instanceof Error ? e.message : "Could not start the connection."); } setBusy(false); }}>
      {busy ? "Opening Google…" : "Connect Google Search Console"}
    </button>
  );
}

/** Google search for the Analytics tab: an invitation to connect, or the four numbers, the chart over time and the pages that should get more clicks. */
export function SearchCard({ id, days = 28 }: { id: string; days?: number }) {
  const { isAdmin } = useMe();
  const toast = useToast();
  const { data, mutate } = useSWR<SearchStatus>(`/api/sites/${id}/search`, fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  useGscNotice(id, () => { mutate(); });
  if (!data || !data.configured) return null;

  const connected = data.connected && data.error !== "revoked";
  if (!connected) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex min-w-[260px] flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold">See how this website does in Google</h2>
          <p className="text-sm leading-relaxed text-ink-2">{data.error === "revoked" ? "Google access was removed or has expired. Connect again to keep the data coming." : "Connect Google Search Console to see clicks, where your pages rank, what people search to find you, and which pages should get more clicks. Read-only, and you can disconnect any time."}</p>
        </div>
        <ConnectButton id={id} />
      </Card>
    );
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

  const opps = data.opportunities ?? [];
  const shown = all ? opps : opps.slice(0, 5);
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold">Search performance</h2>
          <span className="text-[13px] text-muted">
            Google, last {data.series?.length ? days : 28} days ·{" "}
            {data.property ? <>Reading <b className="font-mono font-medium text-ink-2">{data.property.replace("sc-domain:", "")}</b></> : "Connected"}
            {data.fetched ? ` · updated ${fmtAgo(data.fetched)}` : ""}
            {isAdmin && data.property && <> · <button type="button" onClick={refresh} disabled={busy !== null} className="font-semibold text-brand hover:underline disabled:opacity-60">{busy === "refresh" ? "Updating…" : "Refresh"}</button></>}
          </span>
        </div>
        {isAdmin && <button type="button" onClick={disconnect} disabled={busy !== null} className="min-h-9 rounded-lg border border-[#c9cfd8] px-3.5 text-sm font-semibold text-ink-2 hover:bg-soft disabled:opacity-60">Disconnect</button>}
      </div>

      {data.error === "no_property" || !data.property ? (
        <p className="rounded-lg bg-soft px-4 py-5 text-sm text-ink-2">This website is not in your Search Console yet. Add and verify it at search.google.com/search-console with the connected Google account, then press Refresh.</p>
      ) : !data.summary ? (
        <p className="rounded-lg bg-soft px-4 py-5 text-sm text-ink-2">Connected. The first data arrives shortly. Press Refresh to read it now.</p>
      ) : (
        <>
          {data.series?.length ? <SearchOverview series={data.series} days={days} /> : (
            <p className="rounded-lg bg-soft px-4 py-5 text-sm text-ink-2">Press Refresh to load the daily chart.</p>
          )}
          {opps.length > 0 && (
            <div className="flex flex-col border-t border-line-soft pt-3">
              <span className="pb-1 text-[13px] font-semibold text-muted">Pages that should get more clicks (last 28 days)</span>
              {shown.map((o) => (
                <div key={o.page} className="flex flex-col gap-1 border-t border-line-soft py-3 first:border-t-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <a href={o.page} target="_blank" rel="noreferrer" className="min-w-0 break-all font-mono text-[14px] font-semibold text-brand hover:underline">{path(o.page)}</a>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand-ink">about {o.missed_clicks.toLocaleString()} more clicks a month</span>
                  </div>
                  <span className="text-sm text-ink-2">Position {o.position} · shown {o.impressions.toLocaleString()} times · {o.clicks.toLocaleString()} clicks · {pct(o.ctr)} click rate, where about {pct(o.expected_ctr)} is typical</span>
                  {o.queries.length > 0 && <span className="text-[13px] text-muted">People find it by searching: {o.queries.slice(0, 3).map((q) => `“${q.query}”`).join(", ")}</span>}
                </div>
              ))}
              {opps.length > 5 && <button type="button" onClick={() => setAll((v) => !v)} className="min-h-9 self-start text-[13px] font-semibold text-brand hover:underline">{all ? "Show fewer" : `Show all ${opps.length}`}</button>}
              <p className="pt-1 text-xs text-muted">The typical click rates are rough industry figures, and the extra clicks are an estimate, not a promise. A clearer title or description can help, but rankings and seasons also move the numbers.</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

type Tab = "pages" | "countries" | "devices" | "queries";
const TABS: [Tab, string][] = [["pages", "Pages"], ["countries", "Countries"], ["devices", "Devices and browsers"], ["queries", "Queries"]];

/** Full-width breakdowns. Pages, devices and browsers come from the visitors the tracking counts; countries and queries come from Google, so they need Search Console. */
export function TrafficTabs({ id, a }: { id: string; a: AnalyticsResponse["current"] }) {
  const [tab, setTab] = useState<Tab>("pages");
  const { data } = useSWR<SearchStatus>(`/api/sites/${id}/search`, fetcher);
  const [more, setMore] = useState(false);
  const googleReady = !!data?.connected && data.error !== "revoked" && !!data.property;

  const table = <K extends "country" | "query">(key: K, rows: SearchRow<K>[] | null | undefined, name: (v: string) => string) => {
    if (!googleReady) {
      return data && !data.configured ? <p className="px-1 py-8 text-center text-sm text-muted">Google Search Console is not set up on this server yet.</p> : (
        <div className="flex flex-col items-center gap-3 px-1 py-8 text-center">
          <p className="max-w-[460px] text-sm text-muted">{key === "query" ? "See what people search to find this website, with clicks, times shown, click rate and position." : "See which countries your Google visitors come from."} Connect Google Search Console to show it here.</p>
          <ConnectButton id={id} />
        </div>
      );
    }
    if (!rows?.length) return <p className="px-1 py-8 text-center text-sm text-muted">No data yet. Press Refresh in the Google search card above.</p>;
    const list = more ? rows : rows.slice(0, 10);
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[minmax(0,1fr)_80px_100px_70px_80px] gap-3 border-b border-line px-1 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted"><span>{key === "query" ? "Top queries" : "Country"}</span><span className="text-right">Clicks</span><span className="text-right">Impressions</span><span className="text-right">CTR</span><span className="text-right">Position</span></div>
          {list.map((r) => (
            <div key={r[key]} className="grid grid-cols-[minmax(0,1fr)_80px_100px_70px_80px] items-center gap-3 border-b border-line-soft px-1 py-3 text-sm">
              <span className="min-w-0 break-words font-medium">{name(r[key])}</span>
              <span className="text-right font-mono">{r.clicks.toLocaleString()}</span><span className="text-right font-mono">{r.impressions.toLocaleString()}</span>
              <span className="text-right font-mono">{r.ctr != null ? pct(r.ctr) : "—"}</span><span className="text-right font-mono">{r.position != null ? r.position.toFixed(1) : "—"}</span>
            </div>
          ))}
        </div>
        {rows.length > 10 && <button type="button" onClick={() => setMore((v) => !v)} className="mt-2 min-h-9 text-[13px] font-semibold text-brand hover:underline">{more ? "Show fewer" : `Show all ${rows.length}`}</button>}
        <p className="pt-2 text-xs text-muted">From Google, last 28 days.</p>
      </div>
    );
  };

  return (
    <Card className="px-5 pb-4 pt-5">
      <CardTitle aside={tab === "pages" || tab === "devices" ? "From visitors counted by your tracking" : "From Google"}>Traffic breakdown</CardTitle>
      <div role="tablist" aria-label="Traffic breakdown" className="mb-1 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMore(false); }}
            className={`min-h-11 shrink-0 border-b-[3px] px-4 text-[15px] ${tab === k ? "border-brand font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink"}`}>{label}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "pages" && (a.top_pages?.length ? (
          <div>
            <div className="flex justify-between gap-3 border-b border-line px-1 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted"><span>Top pages</span><span>Page views</span></div>
            {a.top_pages.map(([p, n]) => <div key={p} className="flex justify-between gap-3 border-b border-line-soft px-1 py-3"><span className="min-w-0 truncate font-mono text-sm">{p}</span><span className="font-mono text-sm">{n.toLocaleString()}</span></div>)}
          </div>
        ) : <p className="px-1 py-8 text-center text-sm text-muted">No visits recorded in this period yet.</p>)}
        {tab === "devices" && (a.devices?.length || a.browsers?.length ? (
          <div className="flex flex-wrap gap-x-8 gap-y-6 pt-4">
            <div className="flex min-w-[260px] flex-1 flex-col gap-3"><h3 className="text-sm font-semibold">Devices</h3>{a.devices?.map(([name, , p]) => <HBar key={name} label={name} value={`${p}%`} pct={p} color="bg-ok" />)}</div>
            <div className="flex min-w-[260px] flex-1 flex-col gap-3"><h3 className="text-sm font-semibold">Browsers</h3>{a.browsers?.map(([name, , p]) => <HBar key={name} label={name} value={`${p}%`} pct={p} color="bg-ok" />)}</div>
          </div>
        ) : <p className="px-1 py-8 text-center text-sm text-muted">No visits recorded in this period yet.</p>)}
        {tab === "countries" && table("country", data?.countries, countryName)}
        {tab === "queries" && table("query", data?.queries, (q) => q)}
      </div>
    </Card>
  );
}
