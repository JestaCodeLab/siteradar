"use client";

import { fetcher, send } from "./api";

declare global {
  interface Window {
    PaystackPop?: new () => { resumeTransaction: (code: string, cb: { onSuccess: () => void; onCancel: () => void; onError: (e: { message?: string }) => void }) => void };
  }
}

function loadScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your connection and try again."));
    document.head.appendChild(s);
  });
}

export type CheckoutResult = "done" | "paid" | "cancelled" | "pending";

/**
 * Start a plan purchase. Free plans and test mode finish straight away ("done"). Otherwise Paystack's popup opens on
 * this page; when the person pays we confirm it with the server ("paid") or they close it ("cancelled").
 */
export async function checkout(path: string, body: { plan: string; cycle: string }): Promise<CheckoutResult> {
  const r = await send<{ done?: boolean; access_code?: string; reference?: string; url?: string }>("POST", path, body);
  if (r.done) return "done";
  if (!r.access_code || !r.reference) throw new Error("Payments are not available right now.");
  await loadScript();
  const outcome = await new Promise<"success" | "cancelled">((resolve, reject) => {
    new window.PaystackPop!().resumeTransaction(r.access_code!, {
      onSuccess: () => resolve("success"), onCancel: () => resolve("cancelled"),
      onError: (e) => reject(new Error(e?.message ?? "The payment could not be started.")),
    });
  });
  if (outcome === "cancelled") return "cancelled";
  for (let i = 0; i < 4; i++) {          // mobile money can take a few seconds to confirm
    const v = await fetcher<{ status: string }>(`/api/billing/verify?reference=${encodeURIComponent(r.reference)}`).catch(() => null);
    if (v?.status === "success") return "paid";
    await new Promise((res) => setTimeout(res, 2500));
  }
  return "pending";
}
