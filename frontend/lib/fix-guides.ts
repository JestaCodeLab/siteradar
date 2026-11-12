/**
 * "Show fix" content for websites that cannot be fixed by one click: what to change and, where the pattern is the same for every site of that kind, code to adapt.
 * Written by hand, no AI. SiteRadar cannot see a website's source code, so code here is an example, never an exact change; Shopify steps are exact because every store admin has the same screens.
 */
export interface FixGuide { note?: string; example?: boolean; snippets: { label: string; code: string }[] }

const HEADERS: Record<string, [string, string]> = {
  no_hsts: ["Strict-Transport-Security", "max-age=31536000"],
  no_xcto: ["X-Content-Type-Options", "nosniff"],
  no_frame: ["X-Frame-Options", "SAMEORIGIN"],
  no_referrer_policy: ["Referrer-Policy", "strict-origin-when-cross-origin"],
};

function headerGuide(rule: string, platform: string | null): FixGuide {
  const [key, value] = HEADERS[rule];
  const hsts = rule === "no_hsts" ? " Only turn HSTS on when every page of the website works over https, because browsers remember it for a long time." : "";
  const nextjs = { label: "Next.js: next.config.js", code: `module.exports = {\n  async headers() {\n    return [\n      { source: "/(.*)", headers: [{ key: "${key}", value: "${value}" }] },\n    ];\n  },\n};` };
  const vercel = { label: "Vercel: vercel.json", code: `{\n  "headers": [\n    { "source": "/(.*)", "headers": [{ "key": "${key}", "value": "${value}" }] }\n  ]\n}` };
  const netlify = { label: "Netlify: a file named _headers in the publish folder", code: `/*\n  ${key}: ${value}` };
  const nginx = { label: "nginx", code: `add_header ${key} "${value}" always;` };
  const apache = { label: "Apache: .htaccess", code: `Header always set ${key} "${value}"` };
  const order = platform === "nextjs" ? [nextjs, vercel] : platform === "vercel" ? [vercel, nextjs] : platform === "netlify" ? [netlify] : [vercel, netlify, nginx, apache];
  return { note: `Send the ${key} header with every page. Use the block that matches where your website is hosted.${hsts}`, example: true, snippets: order };
}

const code = (label: string, c: string) => ({ label, code: c });

/** Exact steps for Shopify stores: the admin screens are the same for everyone. Findings that a store cannot change say so. */
const SHOPIFY: Record<string, string> = {
  no_hsts: "Shopify sets security headers itself and does not let a store change them, so this one cannot be fixed from your store. It does not affect your customers.",
  no_xcto: "Shopify sets security headers itself and does not let a store change them, so this one cannot be fixed from your store.",
  no_frame: "Shopify sets security headers itself and does not let a store change them, so this one cannot be fixed from your store.",
  no_referrer_policy: "Shopify sets security headers itself and does not let a store change them, so this one cannot be fixed from your store.",
  server_leak: "Shopify controls its server headers, so this one cannot be fixed from your store.",
  desc_missing: "Home page: in Shopify admin open Online Store, then Preferences, and fill in the Meta description. Products: open the product, scroll to Search engine listing, choose Edit, and write the description. Collections, pages and blog posts have the same Search engine listing section.",
  desc_length: "Open the page, product or collection, find Search engine listing, choose Edit and keep the description between 120 and 160 characters.",
  title_missing: "Open the page, product or collection, find Search engine listing, choose Edit and fill in the Page title. For the home page use Online Store, then Preferences.",
  title_length: "Open the page, product or collection, find Search engine listing, choose Edit and keep the page title to about 30 to 60 characters.",
  title_duplicate: "Give each product, collection and page its own Page title under Search engine listing.",
  img_alt: "Open the product, click the image in Media, and choose Add alt text. For images in pages and blog posts, click the image in the editor and add alt text. For theme images, use Online Store, Themes, Customize, and select the image.",
  no_favicon: "Online Store, Themes, Customize, Theme settings, Favicon: upload a square image of at least 32 by 32 pixels.",
  robots_missing: "Shopify creates robots.txt for every store. If it is missing, the store is probably password protected. Remove the password in Online Store, Preferences.",
  sitemap_missing: "Shopify creates /sitemap.xml for every store. If it is missing, the store is probably password protected. Remove the password in Online Store, Preferences.",
  canonical_missing: "Shopify adds the canonical tag in most themes. If a page lacks it, your theme removed it, so ask the theme developer or check the theme's theme.liquid for the canonical_url line.",
  lang_missing: "In Online Store, Themes, Edit code, open layout/theme.liquid and make sure the html tag reads: <html lang=\"{{ request.locale.iso_code }}\">",
  no_viewport: "Your theme is missing the viewport tag. In Online Store, Themes, Edit code, open layout/theme.liquid and add inside head: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
  form_labels: "This is in the theme's code. In Online Store, Themes, Edit code, find the form and connect each input to a label with matching for and id attributes, or ask your theme developer.",
};

export function fixGuide(rule: string, platform: string | null): FixGuide | null {
  if (platform === "shopify") return rule in SHOPIFY ? { note: SHOPIFY[rule], snippets: [] } : null;
  if (rule in HEADERS) return headerGuide(rule, platform);
  const next = platform === "nextjs" || platform === "vercel";
  switch (rule) {
    case "server_leak":
      return { note: "Stop sending the header that names your server software.", example: true, snippets: next ? [code("Next.js: next.config.js", "module.exports = {\n  poweredByHeader: false,\n};")] : [code("nginx", "server_tokens off;"), code("Apache", "ServerTokens Prod\nServerSignature Off")] };
    case "no_viewport":
      return { note: "Add the tag inside the page head so pages fit a phone screen.", example: true, snippets: [code("index.html or your layout", '<meta name="viewport" content="width=device-width, initial-scale=1" />'), ...(next ? [code("Next.js App Router: app/layout.tsx", 'export const viewport = { width: "device-width", initialScale: 1 };')] : [])] };
    case "desc_missing": case "desc_length":
      return { note: "Write a 120 to 160 character summary of each page that makes people want to click.", example: true, snippets: next ? [code("Next.js App Router: in each page.tsx or layout.tsx", 'export const metadata = {\n  description: "A 120 to 160 character summary of this page.",\n};')] : [code("index.html, or per page with a head manager such as react-helmet", '<meta name="description" content="A 120 to 160 character summary of this page." />')] };
    case "title_missing": case "title_length": case "title_duplicate":
      return { note: "Give every page its own title of about 30 to 60 characters, with the main topic first.", example: true, snippets: next ? [code("Next.js App Router: in each page.tsx", 'export const metadata = {\n  title: "Main topic | Your brand",\n};')] : [code("index.html, or per page with a head manager such as react-helmet", "<title>Main topic | Your brand</title>")] };
    case "og_missing":
      return { note: "Add sharing tags so links look right on LinkedIn, Facebook and WhatsApp. They must be in the HTML the server sends, because those sites do not run JavaScript.", example: true, snippets: next ? [code("Next.js App Router", 'export const metadata = {\n  openGraph: {\n    title: "Page title",\n    description: "Short description",\n    images: ["/og.png"],\n  },\n};')] : [code("index.html", '<meta property="og:title" content="Page title" />\n<meta property="og:description" content="Short description" />\n<meta property="og:image" content="https://example.com/og.png" />')] };
    case "canonical_missing":
      return { note: "Tell search engines the main address of each page.", example: true, snippets: next ? [code("Next.js App Router", 'export const metadata = {\n  alternates: { canonical: "/this-page" },\n};')] : [code("index.html or per page", '<link rel="canonical" href="https://example.com/this-page" />')] };
    case "lang_missing":
      return { note: "Set the page language on the html element.", example: true, snippets: [code(next ? "Next.js: app/layout.tsx" : "index.html", '<html lang="en">')] };
    case "img_alt":
      return { note: "Describe each meaningful image in a few words. Use an empty alt (alt=\"\") for purely decorative ones. The pages and images affected are listed above.", example: true, snippets: [code("React or Next.js", '<img src="/team.jpg" alt="The three founders at the office" />\n// next/image\n<Image src="/team.jpg" alt="The three founders at the office" width={800} height={600} />')] };
    case "form_labels":
      return { note: "Connect a label to every input so screen readers and voice control can use the form.", example: true, snippets: [code("React", '<label htmlFor="email">Email</label>\n<input id="email" name="email" type="email" />\n// or, with no visible label\n<input aria-label="Email" name="email" type="email" />')] };
    case "robots_missing":
      return { note: "Serve a robots.txt that points to your sitemap.", example: true, snippets: next ? [code("Next.js App Router: app/robots.ts", 'export default function robots() {\n  return {\n    rules: { userAgent: "*", allow: "/" },\n    sitemap: "https://example.com/sitemap.xml",\n  };\n}')] : [code("public/robots.txt", "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml")] };
    case "sitemap_missing":
      return { note: "Publish a sitemap listing your public pages.", example: true, snippets: next ? [code("Next.js App Router: app/sitemap.ts", 'export default function sitemap() {\n  return [\n    { url: "https://example.com/", lastModified: new Date() },\n    { url: "https://example.com/about", lastModified: new Date() },\n  ];\n}')] : [code("public/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://example.com/</loc></url>\n  <url><loc>https://example.com/about</loc></url>\n</urlset>')] };
    case "no_favicon":
      return { note: "Add a favicon so browsers and search results show your icon.", example: true, snippets: [code(next ? "Next.js: put favicon.ico in the app folder, or add this in a layout" : "index.html", '<link rel="icon" href="/favicon.ico" />')] };
    case "no_lazy":
      return { note: "Load images below the first screen only when they are needed.", example: true, snippets: [code("HTML or React", '<img src="/photo.jpg" alt="..." loading="lazy" />'), ...(next ? [code("next/image (lazy by default)", '<Image src="/photo.jpg" alt="..." width={800} height={600} />')] : [])] };
    default:
      return null;
  }
}
