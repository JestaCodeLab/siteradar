/** Who the legal pages speak for. Set these in the environment so the wording can change without touching the code. */
export const LEGAL = {
  company: process.env.NEXT_PUBLIC_LEGAL_NAME || "Jesta Digital Solutions",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@siteradar.com",
  /** Update this date whenever the wording of either page changes. */
  updated: "6 November 2026",
};
