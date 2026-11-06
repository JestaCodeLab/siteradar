"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor, useMe } from "@/lib/me";

/** Pages that stay open to signed-in people: the Google return page and invitation links. */
const OPEN = ["/auth/done", "/invite"];

/**
 * Keeps signed-in people out of the log in, sign up and password pages. Someone who is signed in and
 * goes back to /signup or /login lands on their dashboard (or the next onboarding step) instead.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, isLoading } = useMe();
  const open = OPEN.some((p) => path.startsWith(p));
  const signedIn = !!me?.authenticated;

  useEffect(() => {
    if (!open && signedIn && me) router.replace(homeFor(me));
  }, [open, signedIn, me, router]);

  if (!open && (isLoading || signedIn)) return <main className="min-h-screen bg-[#FBF8F4]" aria-busy="true" />;
  return children;
}
