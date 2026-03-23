/* eslint-disable no-restricted-globals */

// This minimal service worker is required by Chrome to trigger the PWA Install prompt.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // A fetch listener is required to pass Chrome's PWA installability test.
  // We are just passing the requests through normally for now.
  return;
});