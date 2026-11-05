"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormError } from "@/components/auth-shell";
import { btn, Field, input } from "@/components/ui";
import { send } from "@/lib/api";
import { useMe } from "@/lib/me";

const kinds = ["Web agency or freelancer", "Business or online shop", "Church, school or organisation", "Something else"];
const siteCounts = ["1 to 3", "4 to 15", "16 to 50", "More than 50"];
const teamSizes = ["Just me", "2 to 5", "6 to 15", "More than 15"];
const countries = ["Ghana", "Nigeria", "Kenya", "South Africa", "United Kingdom", "Other"];

export default function CompanyStep() {
  const router = useRouter();
  const { ws, mutate } = useMe();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? ws?.name ?? "";
  const setName = setTyped;
  const [kind, setKind] = useState(kinds[1]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function setLogo(f: File | null) { setFile(f); setPreview(f ? URL.createObjectURL(f) : null); }

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { setError("Use a PNG, JPG or WebP image."); return; }
    if (f.size > 1.5 * 1024 * 1024) { setError("The logo is larger than 1.5 MB."); return; }
    setLogo(f);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      await send("POST", "/api/onboarding/company", { name, website: f.get("website"), industry: kind, size: f.get("team"), country: f.get("country") });
      if (file) { const fd = new FormData(); fd.append("logo", file); await send("POST", "/api/onboarding/logo", fd); }
      try { sessionStorage.setItem("sitewatch.sites", String(f.get("sites"))); } catch { /* optional */ }
      await mutate();
      router.push("/onboarding/plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your company.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-x-12 gap-y-8">
      <form onSubmit={submit} className="flex min-w-0 flex-[2_1_520px] flex-col gap-6 rounded-2xl border border-line bg-surface p-7">
        <div className="flex flex-col gap-2"><h1 className="text-[30px] font-semibold">Tell us about your company</h1>
          <p className="text-[15px] text-muted">This sets up your workspace and helps us suggest the right plan on the next step.</p></div>
        <Field label="Company or organisation name" htmlFor="name"><input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" className={input} /></Field>
        <Field label="Company website" hint="optional" htmlFor="website"><input id="website" name="website" type="url" placeholder="https://" defaultValue={ws?.website ?? ""} className={input} /></Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Company logo <span className="font-normal text-muted">(shown at the top of your reports)</span></span>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-[#c9cfd8] p-4">
            {preview || ws?.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview ?? ws?.logo_url ?? ""} alt="Your logo" className="size-16 rounded-lg border border-line bg-white object-contain" />
              : <span className="flex size-16 items-center justify-center rounded-lg bg-brand-soft text-lg font-semibold text-brand">{(name || "SW").slice(0, 2).toUpperCase()}</span>}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-medium">{file ? file.name : "Upload your logo"}</span>
              <span className="text-[13px] text-muted">PNG, JPG or WebP, up to 1.5 MB. A square or wide logo on a light background works best. You can skip this and add it later in Settings.</span>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose logo" onChange={(e) => pick(e.target.files?.[0])} />
            <div className="flex gap-2"><button type="button" onClick={() => fileRef.current?.click()} className={btn.secondary}>{file ? "Replace" : "Choose file"}</button>
              {file && <button type="button" onClick={() => setLogo(null)} className={btn.secondary}>Remove</button>}</div>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2"><legend className="mb-1 text-sm font-medium">What best describes you?</legend>
          <div className="grid gap-2 sm:grid-cols-2">{kinds.map((k) => (
            <label key={k} className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 text-sm ${kind === k ? "border-brand bg-brand-soft font-semibold" : "border-[#c9cfd8]"}`}>
              <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} className="size-4" />{k}</label>))}</div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Websites you will monitor" htmlFor="sites"><select id="sites" name="sites" className={input}>{siteCounts.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="People who will use SiteRadar" htmlFor="team"><select id="team" name="team" className={input}>{teamSizes.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Country" htmlFor="country"><select id="country" name="country" defaultValue={ws?.country ?? "Ghana"} className={input}>{countries.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <FormError message={error} />
        <div className="flex items-center justify-between gap-4"><span className="text-sm text-muted">Step 1 of 3</span>
          <button disabled={busy} className={`${btn.primary} min-h-12 px-8 text-[15px]`}>{busy ? "Saving…" : "Continue"}</button></div>
      </form>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-5">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Report preview</p>
          <div className="flex items-center gap-3 rounded-lg bg-soft p-4">
            {preview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="" className="size-10 rounded object-contain" /> : <span className="flex size-10 items-center justify-center rounded bg-brand-soft text-sm font-semibold text-brand">{(name || "SW").slice(0, 2).toUpperCase()}</span>}
            <div><p className="text-sm font-semibold">{name || "Your company"}</p><p className="text-xs text-muted">Monthly website report</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2">
          <p className="mb-1 font-semibold text-ink">Why we ask</p>
          Your company name and logo appear on your monthly reports and in team invitations. The number of websites and people helps us recommend a plan, and you can change your mind on the next step.
        </div>
        <p className="text-sm text-muted">Free to start. You choose a plan on the next step, and the Free plan needs no card.</p>
      </aside>
    </div>
  );
}
