// Service Worker for Fajr Alarm PWA
const CACHE_NAME = 'fajr-alarm-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/router.js',
  '/js/storage.js',
  '/js/fajr.js',
  '/js/alarm.js',
  '/js/pose.js',
  '/js/situp.js',
  '/js/ui.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests
  if (event.request.url.includes('api.aladhan.com') || 
      event.request.url.includes('nominatim.openstreetmap.org')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle background notifications
self.addEventListener('push', (event) => {
  const options = {
    body: 'Time for Fajr! Wake up and complete your sit-ups.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [500, 200, 500],
    tag: 'fajr-alarm',
    renotify: true,
    actions: [
      { action: 'dismiss', title: 'Dismiss' },
      { action: 'snooze', title: 'Snooze' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Fajr Alarm', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    // User dismissed - do nothing
  } else if (event.action === 'snooze') {
    // Snooze for 5 minutes
    // This would need to communicate with the main app
  } else {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
