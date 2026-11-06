"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAddWebsite } from "@/components/add-website";

/** Old address kept for links and bookmarks: opens the Add website dialog over the websites list. */
export default function NewWebsitePage() {
  const router = useRouter();
  const { open } = useAddWebsite();
  useEffect(() => { open(); router.replace("/websites"); }, [open, router]);
  return null;
}
