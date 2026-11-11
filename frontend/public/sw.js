/* SiteRadar service worker: shows browser notifications for alerts and opens the right page when one is clicked.
   It does not cache pages, so the app is always the latest version. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "SiteRadar";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/app-icon/siteradar-app-icon-192.png",
    badge: "/app-icon/siteradar-app-icon-64.png",
    tag: data.tag || undefined,          // a newer alert of the same kind replaces the older one
    renotify: !!data.tag,
    data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/overview" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/overview", self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of open) {
      if (c.url.startsWith(self.location.origin) && "focus" in c) {
        await c.focus();
        if ("navigate" in c) await c.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
