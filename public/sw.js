// Service worker: nhận thông báo đẩy và hiển thị trên thiết bị (cả khi đã đóng app).
const SHELL = "doan-shell-v2";
const SHELL_FILES = ["/start.html", "/logo-doan.webp"];

// Lưu sẵn trang khởi động (nền xanh + huy hiệu) để mở app đã cài là hiện NGAY, không chờ mạng/máy chủ.
self.addEventListener("install", (e) => e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("doan-shell-") && k !== SHELL) await caches.delete(k);
  await self.clients.claim();
})()));

// Chỉ xử lý trang khởi động và logo: phục vụ từ bộ nhớ đệm ngay, đồng thời làm mới nền (stale-while-revalidate).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin || !SHELL_FILES.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const cached = await cache.match(url.pathname);
    const fresh = fetch(event.request).then((r) => { if (r.ok) cache.put(url.pathname, r.clone()); return r; }).catch(() => cached);
    return cached || fresh;
  })());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data ? event.data.text() : "Thông báo mới" }; }
  const title = data.title || "Đoàn trường THPT Sơn Hà";
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      vibrate: [120, 60, 120],
      data: { url: data.url || "/dashboard" },
    });
    // Tab đang mở: báo để trang phát âm thanh và làm mới danh sách thông báo.
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    windows.forEach((c) => c.postMessage({ type: "push", title }));
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of windows) {
      if ("focus" in c) { await c.focus(); if ("navigate" in c) { try { await c.navigate(url); } catch {} } return; }
    }
    await self.clients.openWindow(url);
  })());
});
