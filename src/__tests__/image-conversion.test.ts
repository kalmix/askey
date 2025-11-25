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
	const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
	return `data:${mimeType};base64,${base64}`;
}

describe('Image to ASCII conversion with real test images', () => {
	it('should convert PNG to ASCII art', async () => {
		const imageUrl = loadTestImage('regular.png');
		const result = await convertImageToAscii({
			imageUrl,
			characters: DEFAULT_CONTROLS.characters,
			brightness: DEFAULT_CONTROLS.brightness,
			contrast: DEFAULT_CONTROLS.contrast,
			saturation: DEFAULT_CONTROLS.saturation,
			hue: DEFAULT_CONTROLS.hue,
			grayscale: DEFAULT_CONTROLS.grayscale,
			sepia: DEFAULT_CONTROLS.sepia,
			invertColors: DEFAULT_CONTROLS.invertColors,
			thresholding: DEFAULT_CONTROLS.thresholding,
			sharpness: DEFAULT_CONTROLS.sharpness,
			edgeDetection: DEFAULT_CONTROLS.edgeDetection,
			spaceDensity: DEFAULT_CONTROLS.spaceDensity,
			selectedGradient: DEFAULT_CONTROLS.selectedGradient,
			ditheringMethod: DEFAULT_CONTROLS.ditheringMethod
		});

		expect(result).toBeTruthy();
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
		expect(result).toContain('<span');
		expect(result).toContain('style="color:');
	});

	it('should convert JPG to ASCII art', async () => {
		const imageUrl = loadTestImage('regular.jpg');
		const result = await convertImageToAscii({
			imageUrl,
			characters: 50,
			brightness: DEFAULT_CONTROLS.brightness,
			contrast: DEFAULT_CONTROLS.contrast,
			saturation: DEFAULT_CONTROLS.saturation,
			hue: DEFAULT_CONTROLS.hue,
			grayscale: DEFAULT_CONTROLS.grayscale,
			sepia: DEFAULT_CONTROLS.sepia,
			invertColors: DEFAULT_CONTROLS.invertColors,
			thresholding: DEFAULT_CONTROLS.thresholding,
			sharpness: DEFAULT_CONTROLS.sharpness,
			edgeDetection: DEFAULT_CONTROLS.edgeDetection,
			spaceDensity: DEFAULT_CONTROLS.spaceDensity,
			selectedGradient: DEFAULT_CONTROLS.selectedGradient,
			ditheringMethod: DEFAULT_CONTROLS.ditheringMethod
		});

		expect(result).toBeTruthy();
		expect(result.split('\n').length).toBeGreaterThan(1);
	});

	it('should generate different output for different character widths', async () => {
		const imageUrl = loadTestImage('regular.png');

		const result50 = await convertImageToAscii({
			imageUrl,
			characters: 50,
			brightness: DEFAULT_CONTROLS.brightness,
			contrast: DEFAULT_CONTROLS.contrast,
			saturation: DEFAULT_CONTROLS.saturation,
			hue: DEFAULT_CONTROLS.hue,
			grayscale: DEFAULT_CONTROLS.grayscale,
			sepia: DEFAULT_CONTROLS.sepia,
			invertColors: DEFAULT_CONTROLS.invertColors,
			thresholding: DEFAULT_CONTROLS.thresholding,
			sharpness: DEFAULT_CONTROLS.sharpness,
			edgeDetection: DEFAULT_CONTROLS.edgeDetection,
			spaceDensity: DEFAULT_CONTROLS.spaceDensity,
			selectedGradient: DEFAULT_CONTROLS.selectedGradient,
			ditheringMethod: DEFAULT_CONTROLS.ditheringMethod
		});

		const result100 = await convertImageToAscii({
			imageUrl,
			characters: 100,
			brightness: DEFAULT_CONTROLS.brightness,
			contrast: DEFAULT_CONTROLS.contrast,
			saturation: DEFAULT_CONTROLS.saturation,
			hue: DEFAULT_CONTROLS.hue,
			grayscale: DEFAULT_CONTROLS.grayscale,
			sepia: DEFAULT_CONTROLS.sepia,
			invertColors: DEFAULT_CONTROLS.invertColors,
			thresholding: DEFAULT_CONTROLS.thresholding,
			sharpness: DEFAULT_CONTROLS.sharpness,
			edgeDetection: DEFAULT_CONTROLS.edgeDetection,
			spaceDensity: DEFAULT_CONTROLS.spaceDensity,
			selectedGradient: DEFAULT_CONTROLS.selectedGradient,
			ditheringMethod: DEFAULT_CONTROLS.ditheringMethod
		});

		expect(result100.length).toBeGreaterThan(result50.length);
	});

	it('should use different gradients', async () => {
		const imageUrl = loadTestImage('regular.png');

		const resultStandard = await convertImageToAscii({
			imageUrl,
			characters: 50,
			brightness: DEFAULT_CONTROLS.brightness,
			contrast: DEFAULT_CONTROLS.contrast,
			saturation: DEFAULT_CONTROLS.saturation,
			hue: DEFAULT_CONTROLS.hue,
			grayscale: DEFAULT_CONTROLS.grayscale,
			sepia: DEFAULT_CONTROLS.sepia,
			invertColors: DEFAULT_CONTROLS.invertColors,
			thresholding: DEFAULT_CONTROLS.thresholding,
			sharpness: DEFAULT_CONTROLS.sharpness,
			edgeDetection: DEFAULT_CONTROLS.edgeDetection,
			spaceDensity: DEFAULT_CONTROLS.spaceDensity,
			selectedGradient: 'Standard',
			ditheringMethod: DEFAULT_CONTROLS.ditheringMethod
		});

		const resultBlocks = await convertImageToAscii({
			imageUrl,
			characters: 50,
			brightness: DEFAULT_CONTROLS.brightness,
			contrast: DEFAULT_CONTROLS.contrast,
			saturation: DEFAULT_CONTROLS.saturation,
			hue: DEFAULT_CONTROLS.hue,
			grayscale: DEFAULT_CONTROLS.grayscale,
			sepia: DEFAULT_CONTROLS.sepia,
			invertColors: DEFAULT_CONTROLS.invertColors,
			thresholding: DEFAULT_CONTROLS.thresholding,
			sharpness: DEFAULT_CONTROLS.sharpness,
			edgeDetection: DEFAULT_CONTROLS.edgeDetection,
			spaceDensity: DEFAULT_CONTROLS.spaceDensity,
			selectedGradient: 'Blocks',
			ditheringMethod: DEFAULT_CONTROLS.ditheringMethod
		});

		// Both should produce valid output
		expect(resultStandard).toBeTruthy();
		expect(resultBlocks).toBeTruthy();
		// They should be different
		expect(resultStandard).not.toBe(resultBlocks);
	});
});
