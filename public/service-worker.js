// Service worker for handling background recording
const CACHE_NAME = 'audio-recording-cache-v1';

// Install event - set up cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([]);
      })
  );
});

// Activate event - clean up old caches
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

// Message Event handler for background recording
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'RECORDING_STATE') {
    // Handle recording state changes
    const { isRecording, audioChunks } = event.data;
    
    if (isRecording) {
      // Store recording state
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then((cache) => {
            return cache.put('recording-state', new Response(JSON.stringify({
              isRecording,
              audioChunks
            })));
          })
      );
    }
  }
});

// Background sync event handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'audio-recording-sync') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match('recording-state');
        })
        .then((response) => {
          if (response) {
            return response.json();
          }
          return null;
        })
        .then((state) => {
          if (state && state.isRecording) {
            // Handle background recording sync
            return Promise.resolve();
          }
        })
    );
  }
}); 