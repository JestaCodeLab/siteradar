// GENERATED from the approved feature-page designs, then corrected by hand so every claim matches what SiteRadar really does.
// The text, icons and search-engine titles for each page under /features. The example card beside each headline is in components/feature-heroes.tsx.

export interface IconPart { tag: string; attrs: Record<string, string> }
export interface FeatureCard { icon: IconPart[]; title: string; text: string }
export interface FeaturePageData {
  group: string;
  name: string;
  icon: IconPart[];
  h1: string;
  lead: string;
  /** Spoken description of the example card, for screen readers. */
  heroLabel: string;
  whatTitle: string;
  cards: FeatureCard[];
  whoTitle: string;
  who: { href: string; label: string; text: string; link: string }[];
  related: string[];
  ctaTitle: string;
  ctaText: string;
  /** The search-result title (up to 60 characters) and description (up to 160). */
  seoTitle: string;
  seoDescription: string;
}

export const FEATURE_PAGES: Record<string, FeaturePageData> = {
  "uptime-monitoring": {
    "group": "Availability",
    "name": "Website uptime monitoring",
    "icon": [
      {
        "tag": "path",
        "attrs": {
          "d": "M3 12h4l3-8 4 16 3-8h4"
        }
      }
    ],
    "h1": "Know your website is down before anyone else does.",
    "lead": "SiteRadar opens your site every few minutes and checks its status, its speed and the words you expect to see. Alerts only go out after two failed checks in a row, so a blip never wakes you up.",
    "heroLabel": "Uptime card for example.com: up, 99.98% uptime in the last 30 days, one slow day, last checked 2 minutes ago",
    "whatTitle": "Everything website uptime monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "13",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M7 7.5h.01M7 16.5h.01"
            }
          }
        ],
        "title": "Status and response",
        "text": "Every check records whether the page loaded and how long the server took to answer."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 6h16M4 12h10M4 18h7"
            }
          }
        ],
        "title": "Expected words",
        "text": "Tell us a word or phrase that should be on the page. If it disappears, we flag it, even when the server says all is well."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M12 7v5l3 2"
            }
          }
        ],
        "title": "Check frequency",
        "text": "Every few minutes on all plans, and every minute on Scale."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 20V10M10 20V4M16 20v-7M22 20H2"
            }
          }
        ],
        "title": "30-day history",
        "text": "A bar for every day, so slow days and outages stand out at a glance."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M20 11a8 8 0 10-2.3 5.7"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M20 4v7h-7"
            }
          }
        ],
        "title": "Recovery alerts",
        "text": "You get told when the site is back, with how long it was down."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "Incident log",
        "text": "Each outage is kept with its start, end and cause for your monthly report."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Prove reliability to every client and spot trouble before they phone you.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Keep your shop, booking page or site earning, and know the moment it stops.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "alerts",
      "performance-monitoring",
      "ssl-monitoring"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Website uptime monitoring and downtime alerts",
    "seoDescription": "Know the moment your website goes down. SiteRadar checks status, speed and expected text every few minutes and alerts you only after two failed checks."
  },
  "alerts": {
    "group": "Availability",
    "name": "Alerts and notifications",
    "icon": [
      {
        "tag": "path",
        "attrs": {
          "d": "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M10 21h4"
        }
      }
    ],
    "h1": "The right alert, to the right person, at the right time.",
    "lead": "When something needs your attention, SiteRadar tells you by email, Slack or Microsoft Teams. Alerts only fire after two failed checks, so your team stops chasing false alarms.",
    "heroLabel": "Alert feed: an email saying shop.example.com is down after two failed checks, a Slack message that it is back up after 4 minutes, and an email about an SSL certificate expiring",
    "whatTitle": "Everything alerts and notifications covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "7",
              "y": "2",
              "width": "10",
              "height": "20",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M11 18h2"
            }
          }
        ],
        "title": "Instant outage alerts",
        "text": "The moment a site is confirmed down, the right people hear about it."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "5",
              "width": "18",
              "height": "14",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 7l9 6 9-6"
            }
          }
        ],
        "title": "Email",
        "text": "For reminders and summaries you want to keep."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z"
            }
          }
        ],
        "title": "Slack and Teams",
        "text": "Post to the channel your team already watches."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M3 5h18l-7 8v6l-4-2v-4z"
            }
          }
        ],
        "title": "No false alarms",
        "text": "A single failed check is ignored. Two in a row sends the alert."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M20 11a8 8 0 10-2.3 5.7"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M20 4v7h-7"
            }
          }
        ],
        "title": "Back-up notices",
        "text": "Know when it is fixed, and how long it was down."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "17",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 9h18M8 2v4M16 2v4"
            }
          }
        ],
        "title": "Renewal reminders",
        "text": "SSL, domain and subscription dates, before they lapse."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Route each client’s alerts to the right person on your team.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Hear about problems on the channel you already use, without logging in.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "uptime-monitoring",
      "ssl-monitoring",
      "domain-monitoring"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Website downtime alerts by email, Slack and Teams",
    "seoDescription": "Get alerted by email, Slack or Microsoft Teams when your website goes down, and again when it is back. Alerts fire only after two failed checks."
  },
  "performance-monitoring": {
    "group": "Performance & SEO",
    "name": "Performance monitoring",
    "icon": [
      {
        "tag": "path",
        "attrs": {
          "d": "M4 18a8 8 0 1116 0"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M12 18l4-6"
        }
      }
    ],
    "h1": "See how fast your site feels to real people.",
    "lead": "SiteRadar runs speed tests on phone and desktop and tracks how long your server takes to answer. You see what is slow and what to fix first, in plain words.",
    "heroLabel": "Performance card: mobile score 64, desktop score 90, largest contentful paint 6.6 seconds on mobile and 1.3 seconds on desktop",
    "whatTitle": "Everything performance monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "7",
              "y": "2",
              "width": "10",
              "height": "20",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M11 18h2"
            }
          }
        ],
        "title": "Phone and desktop",
        "text": "Separate scores, because most visitors now arrive on a phone."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "3"
            }
          }
        ],
        "title": "Main content time",
        "text": "How long until the biggest thing on the page appears. The goal is under 2.5 seconds."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "13",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M7 7.5h.01M7 16.5h.01"
            }
          }
        ],
        "title": "Server response",
        "text": "How quickly your hosting answers, measured on every uptime check."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "16",
              "rx": "2"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "10",
              "r": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M21 16l-5-5-9 9"
            }
          }
        ],
        "title": "Heavy images",
        "text": "Large and unoptimised images that slow the page down."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M20 11a8 8 0 10-2.3 5.7"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M20 4v7h-7"
            }
          }
        ],
        "title": "Browser caching",
        "text": "Files visitors download again and again when they did not need to."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 20V10M10 20V4M16 20v-7M22 20H2"
            }
          }
        ],
        "title": "Trend over time",
        "text": "See whether a change made the site faster or slower."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Show clients the speed gains from your work, month after month.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "A faster site keeps visitors and helps you rank on Google.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "seo-audit",
      "visitor-analytics",
      "uptime-monitoring"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Website performance monitoring for phone and desktop",
    "seoDescription": "Track how fast your website feels on phones and computers. See main content load time, server response and the images and caching slowing pages down."
  },
  "seo-audit": {
    "group": "Performance & SEO",
    "name": "SEO and site audit",
    "icon": [
      {
        "tag": "circle",
        "attrs": {
          "cx": "11",
          "cy": "11",
          "r": "7"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M20 20l-3.5-3.5"
        }
      }
    ],
    "h1": "A daily health check for every page of your site.",
    "lead": "SiteRadar crawls your site every day and runs about 50 checks across search, speed, security and accessibility. You get one health score and a fix list sorted by what matters most.",
    "heroLabel": "Site audit card: health score 81 across 17 pages, with a prioritised list of SEO issues",
    "whatTitle": "Everything SEO and site audit covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12V3h9l9 9-9 9z"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "8",
              "cy": "8",
              "r": "1.5"
            }
          }
        ],
        "title": "Titles and descriptions",
        "text": "Missing, duplicate, too long or too short."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 6h16M4 12h10M4 18h7"
            }
          }
        ],
        "title": "Headings and content",
        "text": "Missing or repeated main headings, and pages with too little text."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"
            }
          }
        ],
        "title": "Links and errors",
        "text": "Broken links, redirects and pages that pretend to exist."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
            }
          }
        ],
        "title": "Security headers",
        "text": "Settings that protect visitors, checked on every page."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "3"
            }
          }
        ],
        "title": "Accessibility",
        "text": "Problems that make the site hard to use for people with disabilities."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 20V10M10 20V4M16 20v-7M22 20H2"
            }
          }
        ],
        "title": "One health score",
        "text": "A score out of 100 you can track and share."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Turn the fix list into the scope for your next piece of client work.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Know exactly what to ask your developer to fix, and why.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "sitemap-monitoring",
      "broken-links",
      "performance-monitoring"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Daily SEO and website audit with a health score",
    "seoDescription": "A daily audit with about 50 checks across SEO, speed, security and accessibility. Get one health score and a fix list sorted by what matters most."
  },
  "sitemap-monitoring": {
    "group": "Performance & SEO",
    "name": "Sitemap monitoring",
    "icon": [
      {
        "tag": "path",
        "attrs": {
          "d": "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M9 3v15M15 6v15"
        }
      }
    ],
    "h1": "Make sure Google can find every page you publish.",
    "lead": "Your sitemap tells search engines which pages exist. SiteRadar reads it every day, checks every page it lists and tells you when pages are added, removed or broken.",
    "heroLabel": "Sitemap card: 14 URLs listed, 14 checked, 0 errors, with 2 pages added and 1 removed since yesterday",
    "whatTitle": "Everything sitemap monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M9 3v15M15 6v15"
            }
          }
        ],
        "title": "Sitemap found and valid",
        "text": "We confirm the file exists and can be read."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M5 12l5 5 9-10"
            }
          }
        ],
        "title": "Every page loads",
        "text": "Listed pages that return an error are flagged."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M20 11a8 8 0 10-2.3 5.7"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M20 4v7h-7"
            }
          }
        ],
        "title": "Added and removed pages",
        "text": "A daily change list, so nothing disappears quietly."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M3 5h18l-7 8v6l-4-2v-4z"
            }
          }
        ],
        "title": "Redirecting pages",
        "text": "Listed pages that redirect somewhere else."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M12 7v5l3 2"
            }
          }
        ],
        "title": "Checked daily",
        "text": "Alongside the daily site audit."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "In your report",
        "text": "Sitemap health appears in the monthly report."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Catch a broken sitemap after a client edits their own site.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Make sure new products and posts are ready for Google.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "seo-audit",
      "broken-links",
      "visitor-analytics"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Sitemap monitoring and sitemap checker",
    "seoDescription": "SiteRadar reads your sitemap every day, checks every page it lists and tells you when pages are added, removed or broken, so Google finds everything."
  },
  "visitor-analytics": {
    "group": "Performance & SEO",
    "name": "Visitor analytics",
    "icon": [
      {
        "tag": "circle",
        "attrs": {
          "cx": "9",
          "cy": "8",
          "r": "4"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M2 21c0-4 3-6 7-6s7 2 7 6"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M17 4a4 4 0 010 8M22 21c0-3-1.5-5-4-5.7"
        }
      }
    ],
    "h1": "Who visits, where they come from, and what they read.",
    "lead": "Simple, cookieless visitor analytics built into SiteRadar. See visits, sources, devices and top pages without a cookie banner or a second tool.",
    "heroLabel": "Visitor analytics card: 4,212 visits this month, 62 percent from Google, 71 percent on phones, and the most viewed pages",
    "whatTitle": "Everything visitor analytics covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "8",
              "r": "4"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M2 21c0-4 3-6 7-6s7 2 7 6"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M17 4a4 4 0 010 8M22 21c0-3-1.5-5-4-5.7"
            }
          }
        ],
        "title": "Visits and page views",
        "text": "How many people came and how much they read."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
            }
          }
        ],
        "title": "Where they came from",
        "text": "Google, social media, other sites or typed in directly."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "7",
              "y": "2",
              "width": "10",
              "height": "20",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M11 18h2"
            }
          }
        ],
        "title": "Phone or computer",
        "text": "So you know which experience to improve first."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "Top and landing pages",
        "text": "Which pages attract people and where they start."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M12 7v5l3 2"
            }
          }
        ],
        "title": "Real page speed",
        "text": "How fast pages actually loaded for your visitors."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "4",
              "y": "11",
              "width": "16",
              "height": "10",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M8 11V7a4 4 0 018 0v4"
            }
          }
        ],
        "title": "Privacy-friendly",
        "text": "Cookieless by design."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Show traffic results next to uptime and SEO in one client report.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Understand your visitors without learning a complex analytics tool.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "performance-monitoring",
      "client-reporting",
      "seo-audit"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Cookieless website visitor analytics",
    "seoDescription": "Privacy-friendly visitor analytics with no cookie banner. See visits, sources, devices, top pages and real page speed next to your website monitoring."
  },
  "ssl-monitoring": {
    "group": "Site integrity",
    "name": "SSL certificate monitoring",
    "icon": [
      {
        "tag": "rect",
        "attrs": {
          "x": "4",
          "y": "11",
          "width": "16",
          "height": "10",
          "rx": "2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M8 11V7a4 4 0 018 0v4"
        }
      }
    ],
    "h1": "Never let a “Not secure” warning scare a customer away.",
    "lead": "SiteRadar watches the security certificate behind the padlock in the address bar. You get reminders well before it expires, and an alert if it ever stops working.",
    "heroLabel": "SSL certificate card for shop.example.com: valid, expires in 28 days, reminder sent",
    "whatTitle": "Everything SSL certificate monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "17",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 9h18M8 2v4M16 2v4"
            }
          }
        ],
        "title": "Expiry date",
        "text": "Days left, counted down on your dashboard."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M5 12l5 5 9-10"
            }
          }
        ],
        "title": "Valid and trusted",
        "text": "If the certificate has expired or cannot be trusted, the check fails and you are alerted."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
            }
          }
        ],
        "title": "HTTPS redirect",
        "text": "We check that visitors on http:// are sent to the secure address."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"
            }
          }
        ],
        "title": "Security headers",
        "text": "We check settings such as HSTS that keep the connection secure."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M10 21h4"
            }
          }
        ],
        "title": "Reminders and alerts",
        "text": "By email, Slack or Teams, to you and your team."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "In your report",
        "text": "Days left appear in every monthly report."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "No more expired certificates on client sites you forgot about.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Keep the padlock, and the trust that comes with it.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "mixed-content",
      "domain-monitoring",
      "alerts"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "SSL certificate expiry monitoring and reminders",
    "seoDescription": "Never let an expired SSL certificate scare customers away. SiteRadar tracks the expiry date, reminds you weeks ahead and alerts you if it stops working."
  },
  "broken-links": {
    "group": "Site integrity",
    "name": "Broken links monitoring",
    "icon": [
      {
        "tag": "path",
        "attrs": {
          "d": "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"
        }
      }
    ],
    "h1": "Find broken links before your visitors do.",
    "lead": "SiteRadar follows the links on your site and tells you which ones lead nowhere, with the page each one sits on, so fixing them takes minutes.",
    "heroLabel": "Broken links card: 3 broken links found across 2 pages, each with the page it was found on",
    "whatTitle": "Everything broken links monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"
            }
          }
        ],
        "title": "Internal links",
        "text": "Links between your own pages that return an error."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
            }
          }
        ],
        "title": "External links",
        "text": "Links to other sites that have moved or closed."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M20 11a8 8 0 10-2.3 5.7"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M20 4v7h-7"
            }
          }
        ],
        "title": "Redirects",
        "text": "Links that point at a redirect instead of the final page."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "16",
              "rx": "2"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "10",
              "r": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M21 16l-5-5-9 9"
            }
          }
        ],
        "title": "Server errors",
        "text": "Pages that fail with a server error."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "Where each link is",
        "text": "The page and the link text, so you can find it fast."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M5 12l5 5 9-10"
            }
          }
        ],
        "title": "Fixed automatically",
        "text": "Fixed links drop off the list on the next crawl."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Keep client sites polished after their own team edits content.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Every broken link is a lost visitor or sale. Find them first.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "seo-audit",
      "sitemap-monitoring",
      "mixed-content"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Broken link checker and monitoring",
    "seoDescription": "Find broken internal and outbound links before visitors do. SiteRadar crawls your website every day and shows each broken link and the page it sits on."
  },
  "mixed-content": {
    "group": "Site integrity",
    "name": "Mixed content monitoring",
    "icon": [
      {
        "tag": "path",
        "attrs": {
          "d": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
        }
      }
    ],
    "h1": "Keep every page fully secure, not just the address bar.",
    "lead": "A secure page can still load images or scripts over an insecure connection. Browsers block or warn about these. SiteRadar finds each one and shows you where it is.",
    "heroLabel": "Mixed content card: a secure page loading 2 files over insecure http, with the files listed",
    "whatTitle": "Everything mixed content monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
            }
          }
        ],
        "title": "Insecure scripts",
        "text": "Usually blocked by browsers, which can break features."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "16",
              "rx": "2"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "10",
              "r": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M21 16l-5-5-9 9"
            }
          }
        ],
        "title": "Insecure images and media",
        "text": "Can trigger a warning instead of the padlock."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 6h16M4 12h10M4 18h7"
            }
          }
        ],
        "title": "Stylesheets",
        "text": "Can break how the page looks."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
            }
          }
        ],
        "title": "Embeds and widgets",
        "text": "Third-party content loaded the old way."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "Page by page",
        "text": "Exactly where each insecure file is used."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"
            }
          }
        ],
        "title": "Simple fix",
        "text": "Usually just http:// changed to https://."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Catch issues left behind after a site moves to https.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Keep the padlock on every page your customers see.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "ssl-monitoring",
      "broken-links",
      "seo-audit"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Mixed content checker for HTTPS websites",
    "seoDescription": "Find insecure http:// images, scripts and files loading on secure pages. SiteRadar shows each mixed content issue and where it is used."
  },
  "dns-monitoring": {
    "group": "Site integrity",
    "name": "DNS record monitoring",
    "icon": [
      {
        "tag": "rect",
        "attrs": {
          "x": "3",
          "y": "4",
          "width": "18",
          "height": "7",
          "rx": "2"
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "x": "3",
          "y": "13",
          "width": "18",
          "height": "7",
          "rx": "2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M7 7.5h.01M7 16.5h.01"
        }
      }
    ],
    "h1": "See every change to your DNS and email records.",
    "lead": "DNS records point your domain at your website and your email. SiteRadar checks them every day, keeps a history of every change and flags missing email security settings.",
    "heroLabel": "DNS card: the MX record changed two hours ago, showing old and new values; A, NS and SPF records unchanged",
    "whatTitle": "Everything DNS record monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
            }
          }
        ],
        "title": "Website records",
        "text": "The A and CNAME records that point to your site."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "5",
              "width": "18",
              "height": "14",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 7l9 6 9-6"
            }
          }
        ],
        "title": "Email records",
        "text": "MX records that route your email."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
            }
          }
        ],
        "title": "SPF, DKIM and DMARC",
        "text": "The settings that keep your email out of spam and stop spoofing."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "13",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M7 7.5h.01M7 16.5h.01"
            }
          }
        ],
        "title": "Name servers",
        "text": "Who controls your DNS, and whether they respond."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M20 11a8 8 0 10-2.3 5.7"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M20 4v7h-7"
            }
          }
        ],
        "title": "Change history",
        "text": "Every change with its date, old value and new value."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "8",
              "cy": "15",
              "r": "4"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M11 12l9-9M17 6l3 3"
            }
          }
        ],
        "title": "CAA records",
        "text": "Which authorities may issue certificates for your domain."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Spot unexpected changes on client domains before email or the site breaks.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Make sure your emails reach inboxes, not spam folders.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "domain-monitoring",
      "ssl-monitoring",
      "alerts"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "DNS record monitoring and email security checks",
    "seoDescription": "Check your DNS and email records every day: A, MX, SPF, DKIM, DMARC, name servers and CAA, with a health score and a history of every change."
  },
  "domain-monitoring": {
    "group": "Site integrity",
    "name": "Domain monitoring",
    "icon": [
      {
        "tag": "circle",
        "attrs": {
          "cx": "12",
          "cy": "12",
          "r": "9"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
        }
      }
    ],
    "h1": "Never lose your domain to a missed renewal.",
    "lead": "SiteRadar tracks when each domain expires, who it is registered with and where it points. Reminders go out before renewal, so your website and email never go dark.",
    "heroLabel": "Domain card for example.com: registered with NameCheap, renews 17 July 2027, 251 days left, two name servers",
    "whatTitle": "Everything domain monitoring covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "17",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 9h18M8 2v4M16 2v4"
            }
          }
        ],
        "title": "Expiry date",
        "text": "Days left, on your dashboard and in every report."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12V3h9l9 9-9 9z"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "8",
              "cy": "8",
              "r": "1.5"
            }
          }
        ],
        "title": "Registrar",
        "text": "Who the domain is registered with."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "13",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M7 7.5h.01M7 16.5h.01"
            }
          }
        ],
        "title": "Name servers",
        "text": "Where the domain points, and whether that changes."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M10 21h4"
            }
          }
        ],
        "title": "Renewal reminders",
        "text": "To you, your team or whoever pays."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "8",
              "r": "4"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M2 21c0-4 3-6 7-6s7 2 7 6"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M17 4a4 4 0 010 8M22 21c0-3-1.5-5-4-5.7"
            }
          }
        ],
        "title": "Every domain",
        "text": "One domain page for each website you monitor."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "In your report",
        "text": "Domain health appears in the monthly report."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Keep every client domain renewed, with no awkward phone calls.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Protect the name customers know you by.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "dns-monitoring",
      "subscriptions-tracker",
      "ssl-monitoring"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Domain expiry monitoring and renewal reminders",
    "seoDescription": "Never lose a domain to a missed renewal. SiteRadar tracks expiry dates, registrar and name servers, and reminds you before renewal."
  },
  "client-reporting": {
    "group": "Reporting and your team",
    "name": "Client reporting",
    "icon": [
      {
        "tag": "path",
        "attrs": {
          "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M14 3v6h6M8 13h8M8 17h5"
        }
      }
    ],
    "h1": "A monthly report your clients will actually read.",
    "lead": "Every month, on the day you choose, SiteRadar sends a clear PDF with your logo. A plain-language summary and to-do list come first. The technical detail for developers comes last.",
    "heroLabel": "Monthly client report with the agency logo, showing uptime 99.97 percent, 4,212 visitors and a health score of 81, plus a plain-language to-do list",
    "whatTitle": "Everything client reporting covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "3"
            }
          }
        ],
        "title": "The short version",
        "text": "One score and two sentences anyone can understand."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M5 12l5 5 9-10"
            }
          }
        ],
        "title": "A to-do list",
        "text": "What to fix, why it matters, who should do it and how long it takes."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12h4l3-8 4 16 3-8h4"
            }
          }
        ],
        "title": "Uptime and speed",
        "text": "Time online, incidents and how fast the site feels."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "8",
              "r": "4"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M2 21c0-4 3-6 7-6s7 2 7 6"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M17 4a4 4 0 010 8M22 21c0-3-1.5-5-4-5.7"
            }
          }
        ],
        "title": "Visitors",
        "text": "Visits, sources and top pages in plain words."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "13",
              "width": "18",
              "height": "7",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M7 7.5h.01M7 16.5h.01"
            }
          }
        ],
        "title": "Domain, DNS and email",
        "text": "Renewal dates and email security at a glance."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"
            }
          }
        ],
        "title": "Technical appendix",
        "text": "Every finding, URL and record for the developer."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Prove your value every month without building reports by hand.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Understand your website in five minutes, once a month.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "team-access",
      "visitor-analytics",
      "seo-audit"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Automated monthly website reports for clients",
    "seoDescription": "Send clients a clear monthly PDF with your logo: a plain-language summary and to-do list first, technical detail last. Created and sent automatically."
  },
  "subscriptions-tracker": {
    "group": "Reporting and your team",
    "name": "Subscriptions and invoices",
    "icon": [
      {
        "tag": "rect",
        "attrs": {
          "x": "2",
          "y": "5",
          "width": "20",
          "height": "14",
          "rx": "2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M2 10h20"
        }
      }
    ],
    "h1": "Every renewal and invoice, in one place.",
    "lead": "Track the domains, hosting and tools behind each website. You get renewal dates, reminders, invoice PDFs and a monthly spend report, so nothing lapses and nothing is forgotten when you bill.",
    "heroLabel": "Subscriptions card: upcoming renewals for a domain, hosting and Google Workspace with amounts in Ghana cedis and invoice PDFs, and a monthly spend of GHS 1,240",
    "whatTitle": "Everything subscriptions and invoices covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "4",
              "width": "18",
              "height": "17",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 9h18M8 2v4M16 2v4"
            }
          }
        ],
        "title": "Renewal dates",
        "text": "Upcoming renewals sorted by date."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M10 21h4"
            }
          }
        ],
        "title": "Reminders",
        "text": "Before each renewal, to whoever pays."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M14 3v6h6M8 13h8M8 17h5"
            }
          }
        ],
        "title": "Invoice PDFs",
        "text": "Stored with each subscription and easy to find at billing time."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 20V10M10 20V4M16 20v-7M22 20H2"
            }
          }
        ],
        "title": "Monthly spend",
        "text": "What each website or client costs to run."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M3 12V3h9l9 9-9 9z"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "8",
              "cy": "8",
              "r": "1.5"
            }
          }
        ],
        "title": "Any currency",
        "text": "Including Ghana cedis."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "8",
              "r": "4"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M2 21c0-4 3-6 7-6s7 2 7 6"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M17 4a4 4 0 010 8M22 21c0-3-1.5-5-4-5.7"
            }
          }
        ],
        "title": "Per client",
        "text": "Group subscriptions by client for clean re-billing."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Re-bill clients accurately and never pay for a forgotten tool.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Know what your digital presence costs, and never miss a renewal.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "domain-monitoring",
      "client-reporting",
      "team-access"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Domain, hosting and subscription renewal tracker",
    "seoDescription": "Track the domains, hosting and tools behind each website. Get renewal reminders, invoice PDFs and a monthly spend report in any currency, including cedis."
  },
  "team-access": {
    "group": "Reporting and your team",
    "name": "Team and client access",
    "icon": [
      {
        "tag": "circle",
        "attrs": {
          "cx": "8",
          "cy": "15",
          "r": "4"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "d": "M11 12l9-9M17 6l3 3"
        }
      }
    ],
    "h1": "The right access for everyone who touches your websites.",
    "lead": "Invite your team and your clients. Admins manage everything, team members do the work, and clients get read-only access to their own websites.",
    "heroLabel": "Team card: four people with Admin, Team member and Client viewer roles, and one pending invitation",
    "whatTitle": "Everything team and client access covers.",
    "cards": [
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "8",
              "cy": "15",
              "r": "4"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M11 12l9-9M17 6l3 3"
            }
          }
        ],
        "title": "Admins",
        "text": "Manage billing, plans, team and every website."
      },
      {
        "icon": [
          {
            "tag": "circle",
            "attrs": {
              "cx": "9",
              "cy": "8",
              "r": "4"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M2 21c0-4 3-6 7-6s7 2 7 6"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M17 4a4 4 0 010 8M22 21c0-3-1.5-5-4-5.7"
            }
          }
        ],
        "title": "Team members",
        "text": "Add websites, act on alerts and send reports."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
            }
          },
          {
            "tag": "circle",
            "attrs": {
              "cx": "12",
              "cy": "12",
              "r": "3"
            }
          }
        ],
        "title": "Client viewers",
        "text": "Read-only access to their own websites and reports."
      },
      {
        "icon": [
          {
            "tag": "rect",
            "attrs": {
              "x": "3",
              "y": "5",
              "width": "18",
              "height": "14",
              "rx": "2"
            }
          },
          {
            "tag": "path",
            "attrs": {
              "d": "M3 7l9 6 9-6"
            }
          }
        ],
        "title": "Simple invitations",
        "text": "Invite by email. Resend or cancel at any time."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
            }
          }
        ],
        "title": "Remove access instantly",
        "text": "When someone leaves, they lose access straight away."
      },
      {
        "icon": [
          {
            "tag": "path",
            "attrs": {
              "d": "M4 20V10M10 20V4M16 20v-7M22 20H2"
            }
          }
        ],
        "title": "Seats by plan",
        "text": "More team members on larger plans."
      }
    ],
    "whoTitle": "Built for whoever looks after the website.",
    "who": [
      {
        "href": "/agencies",
        "label": "For agencies",
        "text": "Give clients a window into their site without exposing others.",
        "link": "SiteRadar for agencies →"
      },
      {
        "href": "/businesses",
        "label": "For businesses",
        "text": "Bring in your developer or marketer without sharing a password.",
        "link": "SiteRadar for businesses →"
      }
    ],
    "related": [
      "client-reporting",
      "alerts",
      "subscriptions-tracker"
    ],
    "ctaTitle": "Put your website on the radar.",
    "ctaText": "Add your first website in about ten minutes. Every feature on this page works from day one.",
    "seoTitle": "Team and client access for website monitoring",
    "seoDescription": "Invite your team and give clients read-only access to their own websites and reports. Admins, team members and client viewers each see only what they should."
  }
};
