import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import type { Plugin } from 'vite';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const wasmPlugin = (): Plugin => ({
	name: 'wasm-mime-type',
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			if (req.url?.endsWith('.wasm')) {
				res.setHeader('Content-Type', 'application/wasm');
			}
			next();
		});
	},
	configurePreviewServer(server) {
		server.middlewares.use((req, res, next) => {
			if (req.url?.endsWith('.wasm')) {
				res.setHeader('Content-Type', 'application/wasm');
			}
			next();
		});
	}
});

export default defineConfig({
	plugins: [wasmPlugin(), sveltekit()],
	server: {
		host: false,
		fs: {
			allow: ['.', 'node_modules']
		},
		headers: {
			'Cross-Origin-Opener-Policy': 'cross-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	preview: {
		headers: {
			'Cross-Origin-Opener-Policy': 'cross-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	worker: {
		format: 'es' // No, eso no significa español...                        hola badamtss.
	},
	optimizeDeps: {
		exclude: ['gifski-wasm']
	},
	assetsInclude: ['**/*.wasm'],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	build: {
		target: 'esnext',
		assetsInlineLimit: 0
	}
});
