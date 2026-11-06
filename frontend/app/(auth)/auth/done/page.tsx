"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { mutate } from "swr";
import { fetcher, send, type Me } from "@/lib/api";
import { homeFor } from "@/lib/me";

/** Where Google sign-in ends. The address carries a one-time ticket; trading it for the session here, with an ordinary request, works
 * even in browsers that drop the cookie a redirect sets. Then it works out where the person belongs next. */
export default function AuthDone() {
  const router = useRouter();
  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("t");
    const signedIn = ticket ? send<Me>("POST", "/api/auth/ticket", { t: ticket }) : fetcher<Me>("/api/auth/me");
    signedIn
      .then(async (me) => {
        if (!me.authenticated) return router.replace("/login?error=google");
        await mutate("/api/auth/me", me, false);
        router.replace(homeFor(me));
      })
      .catch(() => router.replace("/login?error=google"));
  }, [router]);
  return <main className="flex min-h-screen items-center justify-center text-[#475569]" role="status">Signing you in…</main>;
}
