import type { NextConfig } from "next";

// The Flask service (monitoring, scheduler, database). On Railway use its private address,
// for example http://sitewatch.railway.internal:8080
const backend = process.env.BACKEND_URL ?? "http://localhost:8080";

const dev = process.env.NODE_ENV !== "production";

// What a page may load. Scripts stay inline-capable (Next.js needs it without per-request nonces), but nothing can be loaded from
// or sent to an unlisted site, the page can't be framed, and forms can only post to us or to Google sign-in.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.paystack.co${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.paystack.co https://checkout.paystack.com${dev ? " ws: wss:" : ""}`,
  "frame-src https://checkout.paystack.com https://js.paystack.co",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Tailwind v4 through Turbopack (kept from the create-next-app setup)
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // Signed-in and one-off pages stay out of search results.
  async headers() {
    const paths = ["/admin/:path*", "/overview/:path*", "/websites/:path*", "/subscriptions/:path*", "/settings/:path*", "/activity/:path*", "/billing/:path*", "/team/:path*",
      "/onboarding/:path*", "/verify", "/forgot", "/invite/:path*", "/auth/:path*"];
    return [
      { source: "/:path*", headers: securityHeaders },
      ...paths.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
    ];
  },
  // The two audience pages used to live under /solutions.
  async redirects() {
    return [
      { source: "/solutions", destination: "/agencies", permanent: true },
      { source: "/solutions/agencies", destination: "/agencies", permanent: true },
      { source: "/solutions/businesses", destination: "/businesses", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      // The tracking snippet on every monitored website loads these from the public address.
      { source: "/t.js", destination: `${backend}/t.js` },
      { source: "/collect", destination: `${backend}/collect` },
    ];
  },
};

export default nextConfig;
