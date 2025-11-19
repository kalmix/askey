/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `askey-cache-${version}`;
const ASSETS = [...build, ...files];

const handleInstall = (event: ExtendableEvent) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
	);
};

const handleActivate = (event: ExtendableEvent) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key.startsWith('askey-cache-') && key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			)
		).then(() => self.clients.claim())
	);
};

const handleFetch = (event: FetchEvent) => {
    const request = event.request;
	if (request.method !== 'GET') {
		return;
	}

	const url = new URL(request.url);

	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
		return;
	}

	if (url.origin === self.location.origin) {
		if (request.headers.get('accept')?.includes('text/html')) {
			event.respondWith(
				fetch(request)
					.then((response) => {
						const copy = response.clone();
						const cacheResponse = copy.ok ? copy : null;
						if (cacheResponse) {
							caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheResponse));
						}
						return response;
					})
					.catch(async () => (await caches.match(request)) ?? (await caches.match('/')) ?? Response.error())
			);
			return;
		}

		event.respondWith(
			caches.match(request).then(
				(cached) =>
					cached ||
					fetch(request).then((response) => {
						const copy = response.clone();
						if (copy.ok) {
							caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
						}
						return response;
					})
			)
		);
	}
};

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);
