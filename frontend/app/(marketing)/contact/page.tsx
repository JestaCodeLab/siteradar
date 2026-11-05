"use client";

import { useState } from "react";
import { Section } from "@/components/mkt";
import { btn, Field, input } from "@/components/ui";
import { send } from "@/lib/api";

const topics = ["Choosing a plan", "More than 50 websites", "Moving from another tool", "Technical question", "Something else"];

export default function Contact() {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setState("busy"); setError(null);
    try { await send("POST", "/api/contact", f); setState("sent"); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send your message."); setState("idle"); }
  }

  return (
    <Section tone="soft" className="!py-14 lg:!py-20">
      <div className="flex flex-wrap gap-x-16 gap-y-12">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
          <h1 className="text-[40px] font-semibold leading-[1.1] lg:text-[48px]">Talk to us</h1>
          <p className="text-lg leading-relaxed text-ink-2">Questions about plans, migrating many websites, or something you would like SiteWatch to check? Send a message and a person will reply, usually within one working day.</p>
          <p className="rounded-xl border border-line bg-surface p-5 text-[15px] leading-relaxed text-ink-2">Already a customer? Log in and write to us from inside your account so we can see your workspace and answer faster.</p>
        </div>
        <div className="min-w-0 flex-[1_1_480px]">
          {state === "sent" ? (
            <div role="status" className="rounded-2xl border border-line bg-surface p-8 text-center">
              <h2 className="text-2xl font-semibold">Message sent</h2>
              <p className="mt-2 text-ink-2">Thank you. We will reply to the email address you gave.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-7">
              <h2 className="text-xl font-semibold">Send a message</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" htmlFor="name"><input id="name" name="name" required autoComplete="name" className={input} /></Field>
                <Field label="Company" hint="optional" htmlFor="company"><input id="company" name="company" autoComplete="organization" className={input} /></Field>
                <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" required autoComplete="email" className={input} /></Field>
                <Field label="Phone" hint="optional" htmlFor="phone"><input id="phone" name="phone" type="tel" autoComplete="tel" className={input} /></Field>
              </div>
              <Field label="What is it about?" htmlFor="topic"><select id="topic" name="topic" className={input}>{topics.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Message" htmlFor="message"><textarea id="message" name="message" required rows={5} className={`${input} py-3`} /></Field>
              {error && <p role="alert" className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
              <button disabled={state === "busy"} className={`${btn.primary} min-h-12 text-[15px]`}>{state === "busy" ? "Sending…" : "Send message"}</button>
              <p className="text-[13px] text-muted">We only use your details to reply to you.</p>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}
