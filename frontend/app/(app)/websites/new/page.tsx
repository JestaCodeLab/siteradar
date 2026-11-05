"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";
import { btn, Card, Crumbs, Field, input, PageHeader } from "@/components/ui";
import { ApiError, send, type SiteCard } from "@/lib/api";
import { useMe } from "@/lib/me";
import { splitEmails } from "@/lib/format";

export default function NewWebsitePage() {
  const router = useRouter();
  const { ws, canWrite } = useMe();
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const site = await send<SiteCard>("POST", "/api/sites", {
        name: f.get("name"), url: f.get("url"), keyword: f.get("keyword"),
        report_to: splitEmails(f.get("report_to")), alert_to: splitEmails(f.get("alert_to")),
      });
      await mutate("/api/sites");
      router.push(`/websites/${site.id}`);
    } catch (err) {
      setLimit(err instanceof ApiError && err.code === "limit");
      setError(err instanceof Error ? err.message : "Could not add the website.");
      setBusy(false);
    }
  }

  return (
    <>
      <Crumbs items={[{ label: "Overview", href: "/overview" }, { label: "Add website" }]} />
      <PageHeader title="Add website" subtitle="SiteWatch starts checking it right away and shows you the tracking snippet to install." />
      {ws && ws.usage.sites >= ws.plan.sites && (
        <p role="status" className="max-w-2xl rounded-xl bg-warn-soft px-5 py-4 text-[15px] text-warn"><b>You are using all {ws.plan.sites} website{ws.plan.sites === 1 ? "" : "s"} on the {ws.plan.name} plan.</b> Your sites keep running. <Link href="/billing" className="font-semibold underline">Upgrade</Link> to add more.</p>
      )}
      {!canWrite && <p className="max-w-2xl rounded-xl bg-line-soft px-5 py-4 text-[15px]">You have view-only access, so you can&apos;t add websites.</p>}
      <Card className="max-w-2xl p-5">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Field label="Name" htmlFor="name"><input id="name" name="name" required className={input} placeholder="Acme Ltd" /></Field>
          <Field label="Address" htmlFor="url"><input id="url" name="url" required className={input} placeholder="https://www.example.com" /></Field>
          <Field label="Text the page must contain" htmlFor="keyword" hint="optional, catches blank pages">
            <input id="keyword" name="keyword" className={input} placeholder="Contact" />
          </Field>
          <Field label="Send the monthly report to" htmlFor="report_to" hint="separate emails with commas">
            <input id="report_to" name="report_to" className={input} placeholder="you@company.com, client@example.com" />
          </Field>
          <Field label="Extra people to alert when it goes down" htmlFor="alert_to" hint="optional">
            <input id="alert_to" name="alert_to" className={input} />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error} {limit && <Link href="/billing" className="font-semibold underline">See plans</Link>}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className={btn.secondary}>Cancel</button>
            <button type="submit" disabled={busy} className={btn.primary}>{busy ? "Adding…" : "Add website"}</button>
          </div>
        </form>
      </Card>
    </>
  );
}
