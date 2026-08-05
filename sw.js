// PWA Service Worker - 离线缓存
const CACHE = 'diary-v38';
const ASSETS = ['/', '/index.html', '/css/style.css', '/manifest.json', '/js/i18n.js', '/js/store.js', '/js/cloud.js', '/js/charts.js', '/js/utils.js', '/js/task-aggregate.js', '/js/app.js', '/js/mod-habits.js', '/js/mod-study.js', '/js/mod-health.js', '/js/mod-work.js', '/js/mod-news.js', '/js/mod-diary.js', '/js/mod-wardrobe.js', '/js/mod-goods.js', '/js/mod-savings.js', '/js/mod-reminders.js', '/js/mod-calendar.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // OCR 引擎与语言模型：体积大且永不变动 —— 缓存优先，命中即秒开，避免重复下载
  if (e.request.url.includes('/vendor/tesseract/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return resp;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(e.request, { cache: 'reload' }).then((resp) => {
      if (resp && resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(e.request).then((c) => c || Response.error()))
  );
});
