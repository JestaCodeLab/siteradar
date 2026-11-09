import { ImageResponse } from "next/og";
import { FEATURE_PAGES } from "@/lib/feature-pages";

/** The 1200 x 630 share picture for a feature page, drawn from its name and headline. Link previews on WhatsApp, LinkedIn, Facebook and X use it. */
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(FEATURE_PAGES).map((slug) => ({ slug }));

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = FEATURE_PAGES[slug];
  if (!page) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FFF7ED", padding: "64px 72px", borderLeft: "16px solid #F97316" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 700, color: "#0F172A" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, border: "6px solid #F97316", display: "flex" }} />
          SiteRadar
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#C2410C" }}>{page.name}</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.08, color: "#0F172A" }}>{page.h1}</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#475569" }}>See everything. Stay ahead.</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
