"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { mutate as globalMutate } from "swr";
import { useToast } from "./toast";
import { fetcher, type AuditResponse } from "@/lib/api";

interface Watch { id: string; name: string; since: number }
const KEY = "siteradar.audits.watching";
const Ctx = createContext<{ watch: (id: string, name: string) => void }>({ watch: () => {} });
export const useAuditWatch = () => useContext(Ctx);

function load(): Watch[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "[]") as Watch[]; } catch { return []; }
}

/**
 * Keeps an eye on audits started by hand, wherever the person goes in the app afterwards, and tells them when each one is done with a link to the findings.
 * The list survives moving between pages and reloading the tab, and an audit that never finishes is dropped after ten minutes.
 */
export function AuditWatchProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [list, setList] = useState<Watch[]>([]);
  const busy = useRef(false);

  useEffect(() => { setList(load()); }, []);
  const save = (next: Watch[]) => { setList(next); try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* the list lasts until the page is reloaded */ } };

  const watch = useCallback((id: string, name: string) => {
    const next = [...load().filter((w) => w.id !== id), { id, name, since: Date.now() / 1000 }];
    setList(next);
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (list.length === 0) return;
    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      let remaining = load();
      for (const w of list) {
        try {
          const r = await fetcher<AuditResponse>(`/api/sites/${w.id}/audit`);
          const finished = !r.running && r.audit && r.audit.ts >= w.since - 2;
          if (finished && r.audit) {
            remaining = remaining.filter((x) => x.id !== w.id);
            const hm = r.audit.issues.filter((i) => i.severity !== "low").length;
            await Promise.all([globalMutate(`/api/sites/${w.id}`), globalMutate(`/api/sites/${w.id}/audit`), globalMutate(`/api/sites/${w.id}/fixes`), globalMutate("/api/sites")]);
            toast.notify(`Audit finished for ${w.name}`, `Score ${r.audit.scores.Overall ?? "—"}. ${hm ? `${hm} high or medium ${hm === 1 ? "issue" : "issues"} to look at.` : "No high or medium issues."}`, { href: `/websites/${w.id}?tab=audit`, label: "View the findings" });
          } else if (Date.now() / 1000 - w.since > 600) {
            remaining = remaining.filter((x) => x.id !== w.id);
          }
        } catch { /* try again on the next tick */ }
      }
      if (remaining.length !== list.length) save(remaining);
      busy.current = false;
    };
    const t = setInterval(tick, 6000);
    return () => clearInterval(t);
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  const api = useMemo(() => ({ watch }), [watch]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
