import { ImageResponse } from "next/og";

/** The picture shown when a page is shared on WhatsApp, LinkedIn, X and so on: /og?title=Pricing */
export function GET(req: Request) {
  const title = (new URL(req.url).searchParams.get("title") ?? "See everything. Stay ahead.").slice(0, 90);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FFF7ED", padding: 72, position: "relative" }}>
        <div style={{ position: "absolute", right: -220, top: -220, width: 760, height: 760, borderRadius: 9999, border: "4px solid #FDBA74", display: "flex" }} />
        <div style={{ position: "absolute", right: -80, top: -80, width: 480, height: 480, borderRadius: 9999, border: "4px solid #FDBA74", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 9999, background: "#F97316", display: "flex" }} />
          <div style={{ fontSize: 44, fontWeight: 700, color: "#0F172A", display: "flex" }}>SiteRadar</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, color: "#0F172A", lineHeight: 1.05, letterSpacing: -2, maxWidth: 900, display: "flex" }}>{title}</div>
        <div style={{ fontSize: 30, color: "#C2410C", display: "flex" }}>Website monitoring for agencies and businesses</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
