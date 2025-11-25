// Fix: Use static import so Vite bundles it correctly
import init, { wbg_rayon_start_worker } from './gifski-wasm-module.js';

self.addEventListener('error', (e) => {
	console.error('WORKER INTERNAL ERROR:', e.message, e.filename, e.lineno);
});

onmessage = async ({ data: { module, memory, receiver } }) => {
	await init(module, memory);
	postMessage(true);
	wbg_rayon_start_worker(receiver);
};
