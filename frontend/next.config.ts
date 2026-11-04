import type { NextConfig } from "next";

// The Flask service (monitoring, scheduler, database). On Railway use its private address,
// for example http://sitewatch.railway.internal:8080
const backend = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Tailwind v4 through Turbopack (kept from the create-next-app setup)
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
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
