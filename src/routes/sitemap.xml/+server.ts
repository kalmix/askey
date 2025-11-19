import type { RequestHandler } from './$types';

const routes = ['/', '/askey-demo.html', '/samples'];

export const prerender = true;

export const GET: RequestHandler = ({ url }) => {
	const baseUrl = url.origin;
	const timestamp = new Date().toISOString();
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
		.map((path) => `  <url><loc>${baseUrl}${path}</loc><lastmod>${timestamp}</lastmod><changefreq>weekly</changefreq><priority>${path === '/' ? '1.0' : '0.6'}</priority></url>`)
		.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
