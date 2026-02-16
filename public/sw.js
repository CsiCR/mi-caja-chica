const CACHE_NAME = 'mi-caja-chica-v2'; // Incrementamos versión
const ASSETS_TO_CACHE = [
    '/app-icon.png',
    '/manifest.json'
];

// No cacheamos '/' por defecto para evitar problemas con hashes de Next.js
// en estrategias Cache-First.

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Forzar activación
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Estrategia Network-First para el HTML (navegación)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/');
            })
        );
        return;
    }

    // Cache-First para el resto (iconos, manifest) que esté en el cache
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Manejo de clics en la notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Al hacer clic, intentamos abrir la app o enfocar la pestaña si ya está abierta
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});
