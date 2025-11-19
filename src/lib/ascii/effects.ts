import type { DitheringName } from './constants';
import { hslToRgb, rgbToHsl } from './color';

export interface FilterOptions {
	brightness: number;
	contrast: number;
	saturation: number;
	hue: number;
	grayscale: number;
	sepia: number;
	invertColors: number;
	thresholding: number;
	sharpness: number;
	edgeDetection: number;
	ditheringMethod: DitheringName;
}

export function applyImageFilters(imageData: ImageData, options: FilterOptions): ImageData {
	const { brightness, contrast, saturation, hue, grayscale, sepia, invertColors, thresholding, sharpness, edgeDetection } = options;
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		let r = data[i];
		let g = data[i + 1];
		let b = data[i + 2];

		if (brightness !== 100) {
			const factor = brightness / 100;
			r *= factor;
			g *= factor;
			b *= factor;
		}

		if (contrast !== 100) {
			const factor = contrast / 100;
			r = ((r / 255 - 0.5) * factor + 0.5) * 255;
			g = ((g / 255 - 0.5) * factor + 0.5) * 255;
			b = ((b / 255 - 0.5) * factor + 0.5) * 255;
		}

		const [h, s, l] = rgbToHsl(r, g, b);
		let newH = h;
		let newS = s;

		if (saturation !== 100) {
			newS = s * (saturation / 100);
		}

		if (hue !== 0) {
			newH = (h + hue / 360) % 1;
		}

		[r, g, b] = hslToRgb(newH, newS, l);

		if (grayscale > 0) {
			const gray = 0.299 * r + 0.587 * g + 0.114 * b;
			const grayFactor = grayscale / 100;
			r = r * (1 - grayFactor) + gray * grayFactor;
			g = g * (1 - grayFactor) + gray * grayFactor;
			b = b * (1 - grayFactor) + gray * grayFactor;
		}

		if (sepia > 0) {
			const sepiaFactor = sepia / 100;
			const tr = 0.393 * r + 0.769 * g + 0.189 * b;
			const tg = 0.349 * r + 0.686 * g + 0.168 * b;
			const tb = 0.272 * r + 0.534 * g + 0.131 * b;
			r = r * (1 - sepiaFactor) + tr * sepiaFactor;
			g = g * (1 - sepiaFactor) + tg * sepiaFactor;
			b = b * (1 - sepiaFactor) + tb * sepiaFactor;
		}

		if (invertColors > 0) {
			const invertFactor = invertColors / 100;
			r = r * (1 - invertFactor) + (255 - r) * invertFactor;
			g = g * (1 - invertFactor) + (255 - g) * invertFactor;
			b = b * (1 - invertFactor) + (255 - b) * invertFactor;
		}

		data[i] = clampColor(r);
		data[i + 1] = clampColor(g);
		data[i + 2] = clampColor(b);
	}

	let processed = imageData;

	if (sharpness !== 0) {
		processed = applySharpness(processed, sharpness);
	}

	if (edgeDetection > 1) {
		processed = applyEdgeDetection(processed, edgeDetection);
	}

	if (thresholding !== 128) {
		processed = applyThreshold(processed, thresholding);
	}

	return processed;
}

export function applyDithering(imageData: ImageData, method: DitheringName): ImageData {
	if (method === 'None') {
		return imageData;
	}

	switch (method) {
		case 'Floyd-Steinberg':
			return floydSteinberg(imageData);
		case 'Atkinson':
			return atkinson(imageData);
		case 'Ordered':
			return orderedDithering(imageData);
		default:
			return imageData;
	}
}

function applySharpness(imageData: ImageData, amount: number): ImageData {
	const data = imageData.data;
	const { width, height } = imageData;
	const newData = new Uint8ClampedArray(data);
	const factor = amount / 10;

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = (y * width + x) * 4;

			for (let c = 0; c < 3; c++) {
				const center = data[idx + c];
				const top = data[((y - 1) * width + x) * 4 + c];
				const bottom = data[((y + 1) * width + x) * 4 + c];
				const left = data[(y * width + (x - 1)) * 4 + c];
				const right = data[(y * width + (x + 1)) * 4 + c];
				const sharpened = center * (1 + 4 * factor) - (top + bottom + left + right) * factor;
				newData[idx + c] = clampColor(sharpened);
			}
		}
	}

	return new ImageData(newData, width, height);
}

// Simple edge detection using Sobel operator
function applyEdgeDetection(imageData: ImageData, strength: number): ImageData {
	const data = imageData.data;
	const { width, height } = imageData;
	const newData = new Uint8ClampedArray(data); 

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = (y * width + x) * 4;

			for (let c = 0; c < 3; c++) {
				const gx =
					-1 * data[((y - 1) * width + (x - 1)) * 4 + c] +
					1 * data[((y - 1) * width + (x + 1)) * 4 + c] +
					-2 * data[(y * width + (x - 1)) * 4 + c] +
					2 * data[(y * width + (x + 1)) * 4 + c] +
					-1 * data[((y + 1) * width + (x - 1)) * 4 + c] +
					1 * data[((y + 1) * width + (x + 1)) * 4 + c];

				const gy =
					-1 * data[((y - 1) * width + (x - 1)) * 4 + c] +
					-2 * data[((y - 1) * width + x) * 4 + c] +
					-1 * data[((y - 1) * width + (x + 1)) * 4 + c] +
					1 * data[((y + 1) * width + (x - 1)) * 4 + c] +
					2 * data[((y + 1) * width + x) * 4 + c] +
					1 * data[((y + 1) * width + (x + 1)) * 4 + c];

				const magnitude = Math.sqrt(gx * gx + gy * gy);
				const factor = (strength - 1) / 10;
				newData[idx + c] = clampColor(data[idx + c] + magnitude * factor);
			}
		}
	}

	return new ImageData(newData, width, height);
}

function applyThreshold(imageData: ImageData, threshold: number): ImageData {
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
		const value = gray > threshold ? 255 : 0;
		data[i] = data[i + 1] = data[i + 2] = value;
	}

	return imageData;
}

// Dithering algorithms

function floydSteinberg(imageData: ImageData): ImageData {
	// !TODO
	return imageData;
}

function atkinson(imageData: ImageData): ImageData {
	// !TODO
	return imageData;
}

function orderedDithering(imageData: ImageData): ImageData {
	// !TODO
	return imageData;
}


const clampColor = (value: number) => Math.max(0, Math.min(255, value));
