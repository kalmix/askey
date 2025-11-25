/**
 * @jest-environment jsdom
 */

import { convertImageToAscii } from '../lib/ascii/converter';
import { DEFAULT_CONTROLS } from '../lib/ascii/constants';
import * as fs from 'fs';
import * as path from 'path';

const ASSETS_PATH = path.join(__dirname, 'assets');

function loadTestImage(filename: string): string {
	const filePath = path.join(ASSETS_PATH, filename);
	const buffer = fs.readFileSync(filePath);
	const base64 = buffer.toString('base64');
	const ext = path.extname(filename).slice(1);
	// Handle special cases or default to the extension
	const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext}`;
	return `data:${mimeType};base64,${base64}`;
}

describe('Asset Conversion Tests', () => {
	const files = fs.readdirSync(ASSETS_PATH);
	const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];

	const imageFiles = files.filter((file) => {
		const ext = path.extname(file).toLowerCase();
		return imageExtensions.includes(ext);
	});

	imageFiles.forEach((file) => {
		it(`should process ${file}`, async () => {
			const imageUrl = loadTestImage(file);
			const isCorrupt = file.includes('corrupt') || file.includes('empty');

			try {
				const result = await convertImageToAscii({
					imageUrl,
					...DEFAULT_CONTROLS
				});

				if (isCorrupt) {
				} else {
					expect(result).toBeTruthy();
					expect(typeof result).toBe('string');
					expect(result.length).toBeGreaterThan(0);
				}
			} catch (error) {
				if (!isCorrupt) {
					console.error(`Failed to process ${file}:`, error);
					throw error;
				}
				expect(error).toBeDefined();
				expect((error as Error).message).toContain('Failed to load image');
			}
		});
	});
});
