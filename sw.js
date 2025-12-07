self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 可在此清理舊快取，目前先留空
});

// 直通網路請求：不做離線快取，只讓瀏覽器視為 PWA
self.addEventListener('fetch', (event) => {
  return;
});
