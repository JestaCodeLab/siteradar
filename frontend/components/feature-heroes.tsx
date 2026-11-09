// GENERATED from the approved designs, then edited by hand where the copy had to match what SiteRadar really does.
// Each entry is the example card shown beside the page headline. Server components: no state, no scripts.
import type { ReactElement } from "react";

export const HERO_CARDS: Record<string, () => ReactElement> = {
  "uptime-monitoring": () => (
      <div role="img" aria-label="Uptime card for example.com: up, 99.98% uptime in the last 30 days, one slow day, last checked 2 minutes ago" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            <span className="font-mono [font-weight:500]">
              {"example.com"}
            </span>
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"Up"}
          </span>
        </div>
        <div className="flex [flex-direction:column] [gap:2px]">
          <span className="font-mono [font-size:44px] [font-weight:600] [letter-spacing:-0.03em] [line-height:1.1]">
            {"99.98%"}
          </span>
          <span className="text-[#475569]">
            {"uptime in the last 30 days"}
          </span>
        </div>
        <div className="flex [gap:4px]">
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#F97316]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
          <span className="[flex:1] [height:44px] [border-radius:3px] bg-[#16A34A]" />
        </div>
        <div className="grid [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:10px]">
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Last check"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"2 min ago"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Response"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"182 ms"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Incidents"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"1"}
            </div>
            <div className="[font-size:12px] text-[#475569]">
              {"4 min, resolved"}
            </div>
          </div>
        </div>
      </div>
  ),
  "alerts": () => (
      <div role="img" aria-label="Alert feed: an email saying shop.example.com is down after two failed checks, a Slack message that it is back up after 4 minutes, and an email about an SSL certificate expiring" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            {"Recent alerts"}
          </span>
          <div className="flex [flex-wrap:wrap] [gap:8px]">
            <span className="[font-size:13px] [font-weight:600] text-[#334155] bg-[#F1F5F9] [padding:5px_10px] [border-radius:8px]">
              {"Email"}
            </span>
            <span className="[font-size:13px] [font-weight:600] text-[#334155] bg-[#F1F5F9] [padding:5px_10px] [border-radius:8px]">
              {"Slack"}
            </span>
            <span className="[font-size:13px] [font-weight:600] text-[#334155] bg-[#F1F5F9] [padding:5px_10px] [border-radius:8px]">
              {"Teams"}
            </span>
          </div>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"shop.example.com is down"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Failed 2 checks in a row \u00b7 09:14"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#991B1B] bg-[#FEE2E2] [padding:3px_10px] [border-radius:999px]">
            {"Email"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"shop.example.com is back up"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Down for 4 min \u00b7 09:18"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"Slack"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"SSL certificate expires in 14 days"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"blog.example.com \u00b7 08:00"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"Email"}
          </span>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"2\u00d7"}
          </span>
          <span>
            {"One failed check is ignored. Alerts go out after the second."}
          </span>
        </div>
      </div>
  ),
  "performance-monitoring": () => (
      <div role="img" aria-label="Performance card: mobile score 64, desktop score 90, largest contentful paint 6.6 seconds on mobile and 1.3 seconds on desktop" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            <span className="font-mono [font-weight:500]">
              {"example.com/"}
            </span>
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Checked today"}
          </span>
        </div>
        <div className="grid [grid-template-columns:repeat(2,minmax(0,1fr))] [gap:10px]">
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Mobile score"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"64"}
            </div>
            <div className="[font-size:12px] text-[#475569]">
              {"Needs work"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Desktop score"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"90"}
            </div>
            <div className="[font-size:12px] text-[#475569]">
              {"Very good"}
            </div>
          </div>
        </div>
        <div className="flex [flex-direction:column] [gap:4px] [font-size:13px]">
          <div className="flex [justify-content:space-between]">
            <span>
              {"Main content shows (mobile)"}
            </span>
            <b className="font-mono">
              {"6.6 s"}
            </b>
          </div>
          <div className="[height:8px] [border-radius:4px] bg-[#F1F5F9]">
            <div className="[width:100%] [height:8px] [border-radius:4px] bg-[#DC2626]" />
          </div>
        </div>
        <div className="flex [flex-direction:column] [gap:4px] [font-size:13px]">
          <div className="flex [justify-content:space-between]">
            <span>
              {"Main content shows (desktop)"}
            </span>
            <b className="font-mono">
              {"1.3 s"}
            </b>
          </div>
          <div className="[height:8px] [border-radius:4px] bg-[#F1F5F9]">
            <div className="[width:20%] [height:8px] [border-radius:4px] bg-[#16A34A]" />
          </div>
        </div>
        <div className="flex [flex-direction:column] [gap:4px] [font-size:13px]">
          <div className="flex [justify-content:space-between]">
            <span>
              {"Server response"}
            </span>
            <b className="font-mono">
              {"143 ms"}
            </b>
          </div>
          <div className="[height:8px] [border-radius:4px] bg-[#F1F5F9]">
            <div className="[width:6%] [height:8px] [border-radius:4px] bg-[#16A34A]" />
          </div>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"Tip"}
          </span>
          <span>
            {"Mobile is 5.3 s slower than the goal. Compress the hero image first."}
          </span>
        </div>
      </div>
  ),
  "seo-audit": () => (
      <div role="img" aria-label="Site audit card: health score 81 across 17 pages, with a prioritised list of SEO issues" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            {"Site audit \u00b7 17 pages"}
          </span>
          <span className="font-mono text-[#475569]">
            {"Score 81"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Duplicate page titles"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"4 pages"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"Medium"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Missing main heading (H1)"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"/login, /signup"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"Medium"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Meta description too long"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"5 pages"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Low"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Thin content"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"/pricing \u00b7 178 words"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Low"}
          </span>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"50"}
          </span>
          <span>
            {"About 50 checks, run every day, sorted by what matters most."}
          </span>
        </div>
      </div>
  ),
  "sitemap-monitoring": () => (
      <div role="img" aria-label="Sitemap card: 14 URLs listed, 14 checked, 0 errors, with 2 pages added and 1 removed since yesterday" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            <span className="font-mono [font-weight:500]">
              {"/sitemap.xml"}
            </span>
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"Healthy"}
          </span>
        </div>
        <div className="grid [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:10px]">
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Listed"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"14"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Checked"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"14"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Errors"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"0"}
            </div>
          </div>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"/blog/new-menu"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Since yesterday"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#1E40AF] bg-[#DBEAFE] [padding:3px_10px] [border-radius:999px]">
            {"Added"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"/blog/spring-offer"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Since yesterday"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#1E40AF] bg-[#DBEAFE] [padding:3px_10px] [border-radius:999px]">
            {"Added"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"/old-pricing"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"No longer listed"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Removed"}
          </span>
        </div>
      </div>
  ),
  "visitor-analytics": () => (
      <div role="img" aria-label="Visitor analytics card: 4,212 visits this month, 62 percent from Google, 71 percent on phones, and the most viewed pages" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            {"Visitors \u00b7 this month"}
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#9A3412] bg-[#FFEDD5] [padding:3px_10px] [border-radius:999px]">
            {"No cookies"}
          </span>
        </div>
        <div className="grid [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:10px]">
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Visits"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"4,212"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Pages / visit"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"3.1"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Left after 1 page"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"38%"}
            </div>
          </div>
        </div>
        <div className="flex [flex-direction:column] [gap:4px] [font-size:13px]">
          <div className="flex [justify-content:space-between]">
            <span>
              {"Google"}
            </span>
            <b className="font-mono">
              {"62%"}
            </b>
          </div>
          <div className="[height:8px] [border-radius:4px] bg-[#F1F5F9]">
            <div className="[width:62%] [height:8px] [border-radius:4px] bg-[#F97316]" />
          </div>
        </div>
        <div className="flex [flex-direction:column] [gap:4px] [font-size:13px]">
          <div className="flex [justify-content:space-between]">
            <span>
              {"Direct or bookmark"}
            </span>
            <b className="font-mono">
              {"24%"}
            </b>
          </div>
          <div className="[height:8px] [border-radius:4px] bg-[#F1F5F9]">
            <div className="[width:24%] [height:8px] [border-radius:4px] bg-[#FBA23C]" />
          </div>
        </div>
        <div className="flex [flex-direction:column] [gap:4px] [font-size:13px]">
          <div className="flex [justify-content:space-between]">
            <span>
              {"Social"}
            </span>
            <b className="font-mono">
              {"14%"}
            </b>
          </div>
          <div className="[height:8px] [border-radius:4px] bg-[#F1F5F9]">
            <div className="[width:14%] [height:8px] [border-radius:4px] bg-[#FDBA74]" />
          </div>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"71%"}
          </span>
          <span>
            {"71% of visitors used a phone."}
          </span>
        </div>
      </div>
  ),
  "ssl-monitoring": () => (
      <div role="img" aria-label="SSL certificate card for shop.example.com: valid, expires in 28 days, with reminders starting 21 days before expiry" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            <span className="font-mono [font-weight:500]">
              {"shop.example.com"}
            </span>
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"Valid"}
          </span>
        </div>
        <div className="grid [grid-template-columns:repeat(2,minmax(0,1fr))] [gap:10px]">
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Expires in"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"28 days"}
            </div>
            <div className="[font-size:12px] text-[#475569]">
              {"06 Dec 2026"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"First reminder"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"21 days"}
            </div>
            <div className="[font-size:12px] text-[#475569]">
              {"before expiry"}
            </div>
          </div>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Redirects to https"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"http://shop.example.com \u2192 https"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"OK"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"HSTS header"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Set on the home page"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"OK"}
          </span>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"21 d"}
          </span>
          <span>
            {"Reminders start 21 days before expiry, then daily."}
          </span>
        </div>
      </div>
  ),
  "broken-links": () => (
      <div role="img" aria-label="Broken links card: 3 broken links found across 2 pages, each with the page it was found on" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            {"Broken links \u00b7 last crawl"}
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#991B1B] bg-[#FEE2E2] [padding:3px_10px] [border-radius:999px]">
            {"3 found"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"/menu/autumn-2024.pdf"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Linked from /menu"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#991B1B] bg-[#FEE2E2] [padding:3px_10px] [border-radius:999px]">
            {"404"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"instagram.com/oldhandle"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Linked from footer, every page"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#991B1B] bg-[#FEE2E2] [padding:3px_10px] [border-radius:999px]">
            {"404"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"/blog/launch"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Linked from /about"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"Redirect loop"}
          </span>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"Fix"}
          </span>
          <span>
            {"Each link shows the page it sits on, so it is quick to fix."}
          </span>
        </div>
      </div>
  ),
  "mixed-content": () => (
      <div role="img" aria-label="Mixed content card: a secure page loading 2 files over insecure http, with the files listed" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            <span className="font-mono [font-weight:500]">
              {"https://example.com/about"}
            </span>
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"2 insecure"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              <span className="font-mono [font-size:13px]">
                {"http://cdn.example.com/team.jpg"}
              </span>
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Loaded on /about"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Image"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              <span className="font-mono [font-size:13px]">
                {"http://example.com/widget.js"}
              </span>
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Blocked by browsers"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#991B1B] bg-[#FEE2E2] [padding:3px_10px] [border-radius:999px]">
            {"Script"}
          </span>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"Fix"}
          </span>
          <span>
            {"Change http:// to https:// in these two places."}
          </span>
        </div>
      </div>
  ),
  "dns-monitoring": () => (
      <div role="img" aria-label="DNS card: the MX record changed two hours ago, showing old and new values; A, NS and SPF records unchanged" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            <span className="font-mono [font-weight:500]">
              {"example.com"}
            </span>
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"1 change"}
          </span>
        </div>
        <div className="[border-width:1px] [border-style:solid] border-[#FDE68A] bg-[#FFFBEB] [border-radius:12px] [padding:12px_14px] flex [flex-direction:column] [gap:6px] [font-size:13px]">
          <b className="[font-size:15px]">
            {"MX record changed \u00b7 2 h ago"}
          </b>
          <span className="font-mono text-[#991B1B]">
            {"\u2212 10 mail.oldhost.com."}
          </span>
          <span className="font-mono text-[#166534]">
            {"+ 10 inbound-smtp.eu-west-1.amazonaws.com."}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"A record"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"216.198.79.1"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Unchanged"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Name servers"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"2 responding"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Unchanged"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"SPF and DMARC"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Emails may land in spam"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#991B1B] bg-[#FEE2E2] [padding:3px_10px] [border-radius:999px]">
            {"Missing"}
          </span>
        </div>
      </div>
  ),
  "domain-monitoring": () => (
      <div role="img" aria-label="Domain card for example.com: registered with NameCheap, renews 17 July 2027, 251 days left, two name servers" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            <span className="font-mono [font-weight:500]">
              {"example.com"}
            </span>
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"Registered"}
          </span>
        </div>
        <div className="grid [grid-template-columns:repeat(2,minmax(0,1fr))] [gap:10px]">
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Renews in"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"251 days"}
            </div>
            <div className="[font-size:12px] text-[#475569]">
              {"17 Jul 2027"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Registrar"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"NameCheap"}
            </div>
          </div>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Name servers"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"ns1, ns2 responding"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"OK"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"client-site.com.gh"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Renews 23 Dec 2026"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"45 days"}
          </span>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"Due"}
          </span>
          <span>
            {"Reminders go out before each renewal date."}
          </span>
        </div>
      </div>
  ),
  "client-reporting": () => (
      <div role="img" aria-label="Monthly client report with the agency logo, showing uptime 99.97 percent, 4,212 visitors and a health score of 81, plus a plain-language to-do list" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:18px]">
        <div className="flex [justify-content:space-between] [align-items:center] [border-bottom-width:3px] [border-bottom-style:solid] border-b-[#F97316] [padding-bottom:14px] [gap:12px]">
          <div className="flex [flex-direction:column] [gap:2px]">
            <span className="[font-size:12px] [font-weight:700] [letter-spacing:0.08em] text-[#475569]">
              {"MONTHLY REPORT \u00b7 OCTOBER 2026"}
            </span>
            <span className="[font-size:22px] [font-weight:700] [letter-spacing:-0.02em]">
              {"shop.example.com"}
            </span>
          </div>
          <span className="[font-size:12px] [font-weight:700] text-[#475569] [border-width:1.5px] [border-style:dashed] border-[#CBD5E1] [border-radius:8px] [padding:10px_12px]">
            {"YOUR LOGO"}
          </span>
        </div>
        <div className="grid [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:10px]">
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Uptime"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"99.97%"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Visitors"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"4,212"}
            </div>
          </div>
          <div className="bg-[#FFF7ED] [border-radius:12px] [padding:12px]">
            <div className="[font-size:12px] text-[#475569]">
              {"Health"}
            </div>
            <div className="font-mono [font-size:22px] [font-weight:600]">
              {"81"}
            </div>
          </div>
        </div>
        <div className="flex [flex-direction:column] [gap:10px]">
          <span className="[font-size:14px] [font-weight:700]">
            {"What to do next"}
          </span>
          <div className="flex [align-items:center] [gap:10px] [font-size:14px]">
            <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#991B1B] bg-[#FEE2E2] [padding:3px_10px] [border-radius:999px]">
              {"Fix soon"}
            </span>
            {"Stop your emails landing in spam"}
          </div>
          <div className="flex [align-items:center] [gap:10px] [font-size:14px]">
            <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
              {"Improve"}
            </span>
            {"Make the homepage faster on phones"}
          </div>
        </div>
      </div>
  ),
  "subscriptions-tracker": () => (
      <div role="img" aria-label="Subscriptions card: upcoming renewals for a domain, hosting and Google Workspace with amounts in Ghana cedis and invoice PDFs, and a monthly spend of GHS 1,240" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            {"Upcoming renewals"}
          </span>
          <span className="font-mono text-[#475569]">
            {"GHS 1,240 / month"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Domain \u00b7 client-site.com.gh"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"GHS 180 / year \u00b7 invoice.pdf"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"In 12 days"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Hosting \u00b7 Shop"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"GHS 450 / month \u00b7 invoice.pdf"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#1E40AF] bg-[#DBEAFE] [padding:3px_10px] [border-radius:999px]">
            {"In 26 days"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Google Workspace \u00b7 5 users"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"GHS 610 / month \u00b7 invoice.pdf"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#166534] bg-[#DCFCE7] [padding:3px_10px] [border-radius:999px]">
            {"Paid"}
          </span>
        </div>
        <div className="flex [align-items:center] [gap:10px] [padding:12px_14px] bg-[#FFF7ED] [border-radius:12px] [font-size:14px]">
          <span className="font-mono [font-weight:600] text-[#C2410C]">
            {"PDF"}
          </span>
          <span>
            {"Spend report for every client, sent monthly."}
          </span>
        </div>
      </div>
  ),
  "team-access": () => (
      <div role="img" aria-label="Team card: four people with Admin, Team member and Client viewer roles, and one pending invitation" className="bg-[#FFFFFF] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:20px] [padding:24px] shadow-[0_24px_60px_rgba(124,45,18,0.14)] flex [flex-direction:column] [gap:12px]">
        <div className="flex [justify-content:space-between] [align-items:center] [gap:12px] [font-size:14px]">
          <span className="[font-weight:700]">
            {"Team and client access"}
          </span>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"5 of 5 seats"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Ama Mensah"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"ama@agency.com"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#9A3412] bg-[#FFEDD5] [padding:3px_10px] [border-radius:999px]">
            {"Admin"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Kofi Boateng"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"kofi@agency.com"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#1E40AF] bg-[#DBEAFE] [padding:3px_10px] [border-radius:999px]">
            {"Team member"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"Shop owner"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Read-only \u00b7 shop.example.com"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#334155] bg-[#F1F5F9] [padding:3px_10px] [border-radius:999px]">
            {"Client viewer"}
          </span>
        </div>
        <div className="flex [align-items:center] [justify-content:space-between] [gap:12px] [padding:12px_14px] [border-width:1px] [border-style:solid] border-[#EFE4D8] [border-radius:12px]">
          <div className="[min-width:0]">
            <div className="[font-weight:600] [font-size:15px]">
              {"esi@agency.com"}
            </div>
            <div className="[font-size:13px] text-[#475569] font-mono">
              {"Waiting to accept"}
            </div>
          </div>
          <span className="[flex:none] [font-size:12px] [font-weight:700] text-[#92400E] bg-[#FEF3C7] [padding:3px_10px] [border-radius:999px]">
            {"Invited"}
          </span>
        </div>
      </div>
  ),
};
