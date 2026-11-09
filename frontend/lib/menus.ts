import { FEATURE_GROUPS, featureHref } from "./features";

/** One entry in a navbar dropdown: a link, plus what the preview panel shows while it is hovered. */
export interface MenuItem {
  id: string;
  href: string;
  name: string;
  blurb: string;
  /** The small example card. The numbers are illustrations, not real data. */
  preview: { label: string; chip?: string; big: string; caption: string; bars?: boolean };
}
export interface MenuGroup { title: string; items: MenuItem[] }

export const FEATURE_MENU: MenuGroup[] = FEATURE_GROUPS.map((g) => ({
  title: g.title,
  items: g.items.map((f) => ({ id: f.slug, href: featureHref(f), name: f.name, blurb: f.blurb, preview: f.preview })),
}));

export const SOLUTION_MENU: MenuGroup[] = [
  { title: "Who it is for", items: [
    { id: "agencies", href: "/agencies", name: "Agencies and freelancers",
      blurb: "Look after every client website from one dashboard, send each client a monthly report with your own logo, and give them read-only access to just their site.",
      preview: { label: "Client websites", chip: "All up", big: "12 sites", caption: "watched from one dashboard, with a report for every client" } },
    { id: "businesses", href: "/businesses", name: "Businesses",
      blurb: "Peace of mind without an IT team. Plain-language alerts and fixes for your own website, shop or organisation, and a clear report each month.",
      preview: { label: "Your website", chip: "Good", big: "100%", caption: "online this month, with a short list of what to fix" } },
  ] },
];
