// সার্ভিস ওয়ার্কার: network-first নিয়ম
// আগে নেট থেকে নতুন ফাইল আনে (তাই আপডেট সবসময় আসে),
// নেট না থাকলে আগের সেভ করা (cache) কপি দেখায়।
const CACHE = 'shekhar-ghor-v1';

self.addEventListener('install', () => self.skipWaiting()); // নতুন ভার্সন সাথে সাথে চালু
self.addEventListener('activate', (e) => {
  // পুরনো নামের cache মুছে ফেলি
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // শুধু GET রিকোয়েস্ট
  const url = new URL(req.url);
  // শুধু নিজের সাইটের ফাইল cache করি; Firebase/Google-এর রিকোয়েস্টে হাত দিই না
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        // ঠিকঠাক উত্তর পেলে একটা কপি cache-এ রাখি
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./'))) // নেট নেই: cache থেকে
  );
});
