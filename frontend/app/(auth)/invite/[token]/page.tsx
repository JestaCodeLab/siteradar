"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { AuthShell, FormError } from "@/components/auth-shell";
import { btn, Field, input, Skeleton } from "@/components/ui";
import { ApiError, fetcher, send } from "@/lib/api";

interface Info { email: string; role: string; workspace: string; logo_url: string | null; inviter: string; has_account: boolean }
const roleLabel: Record<string, string> = { admin: "Admin", member: "Member", viewer: "Viewer (read only)" };

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data, error } = useSWR<Info>(`/api/invites/${token}`, fetcher);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setErr(null);
    try { await send("POST", `/api/invites/${token}/accept`, f); router.replace("/overview"); }
    catch (x) { setErr(x instanceof Error ? x.message : "Could not accept the invitation."); setBusy(false); }
  }

  return (
    <AuthShell variant="invite">
      {error ? (
        <div className="flex flex-col gap-3"><h2 className="text-[28px] font-semibold">Invitation not available</h2>
          <p className="text-[15px] text-muted">{error instanceof ApiError ? error.message : "Something went wrong."}</p></div>
      ) : !data ? <Skeleton className="h-64" /> : (
        <>
          <div className="flex items-center gap-4">
            {data.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={data.logo_url} alt="" className="size-14 rounded-xl border border-line object-contain" />
              : <span className="flex size-14 items-center justify-center rounded-xl bg-brand-soft text-lg font-semibold text-brand">{data.workspace.slice(0, 2).toUpperCase()}</span>}
            <p className="text-[15px] leading-snug text-ink-2">{data.inviter || "A colleague"} invited you to join <b className="block text-lg text-ink">{data.workspace}</b></p>
          </div>
          <p className="w-fit rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-ink">Your role: {roleLabel[data.role] ?? data.role}</p>
          <form onSubmit={accept} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5"><h2 className="text-[24px] font-semibold">{data.has_account ? "Log in to accept" : "Set up your account"}</h2>{!data.has_account && <p className="text-sm text-muted">This only takes a minute.</p>}</div>
            <Field label="Email" htmlFor="email"><input id="email" value={data.email} readOnly className={`${input} bg-soft`} /></Field>
            {!data.has_account && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="First name" htmlFor="fn"><input id="fn" name="first_name" required className={input} /></Field>
                  <Field label="Last name" htmlFor="ln"><input id="ln" name="last_name" required className={input} /></Field>
                </div>
                <Field label="Phone number" hint="for SMS alerts, optional" htmlFor="ph"><input id="ph" name="phone" type="tel" className={input} /></Field>
              </>
            )}
            <Field label={data.has_account ? "Your password" : "Create a password"} htmlFor="pw"><input id="pw" name="password" type="password" required minLength={8} autoComplete={data.has_account ? "current-password" : "new-password"} className={input} /></Field>
            <FormError message={err} />
            <button disabled={busy} className={`${btn.primary} min-h-12 text-[15px]`}>{busy ? "Joining…" : "Accept and join the team"}</button>
          </form>
          <p className="text-[13px] leading-relaxed text-muted">No verification code is needed because you opened this link from your invitation email. The link works once and expires in 7 days.</p>
        </>
      )}
    </AuthShell>
  );
}
