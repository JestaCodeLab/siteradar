"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { fetcher, type Me } from "@/lib/api";
import { homeFor } from "@/lib/me";

/** Where Google sends people back to. The server has signed them in; this works out where they belong next. */
export default function AuthDone() {
  const router = useRouter();
  useEffect(() => {
    fetcher<Me>("/api/auth/me")
      .then((me) => router.replace(me.authenticated ? homeFor(me) : "/login?error=google"))
      .catch(() => router.replace("/login?error=google"));
  }, [router]);
  return <main className="flex min-h-screen items-center justify-center text-[#475569]" role="status">Signing you in…</main>;
}
