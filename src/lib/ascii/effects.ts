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
	const {
		brightness,
		contrast,
		saturation,
		hue,
		grayscale,
		sepia,
		invertColors,
		thresholding,
		sharpness,
		edgeDetection
	} = options;
	const data = imageData.data;

	// Pre-calculate filter factors to avoid repeated division
	const applyBrightness = brightness !== 100;
	const brightnessFactor = brightness / 100;

	const applyContrast = contrast !== 100;
	const contrastFactor = contrast / 100;

	const applySaturation = saturation !== 100;
	const saturationFactor = saturation / 100;

	const applyHue = hue !== 0;
	const hueShift = hue / 360;

	const applyGrayscale = grayscale > 0;
	const grayscaleFactor = grayscale / 100;
	const grayFactorInv = 1 - grayscaleFactor;

	const applySepia = sepia > 0;
	const sepiaFactor = sepia / 100;
	const sepiaFactorInv = 1 - sepiaFactor;

	const applyInvert = invertColors > 0;
	const invertFactor = invertColors / 100;
	const invertFactorInv = 1 - invertFactor;

	// Grayscale weights see: https://en.wikipedia.org/wiki/Grayscale#Luma_(luminance)
	const grayR = 0.299;
	const grayG = 0.587;
	const grayB = 0.114;

	// Loop through each pixel
	for (let i = 0; i < data.length; i += 4) {
		// Get the RGB values
		let r = data[i];
		let g = data[i + 1];
		let b = data[i + 2];

		// Apply brightness
		if (applyBrightness) {
			r *= brightnessFactor;
			g *= brightnessFactor;
			b *= brightnessFactor;
		}

		if (applyContrast) {
			r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
			g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
			b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
		}

		if (applySaturation || applyHue) {
			const [h, s, l] = rgbToHsl(r, g, b);
			let newH = h;
			let newS = s;

			if (applySaturation) {
				newS = s * saturationFactor;
			}

			if (applyHue) {
				newH = (h + hueShift) % 1;
			}

			[r, g, b] = hslToRgb(newH, newS, l);
		}

		if (applyGrayscale) {
			const gray = grayR * r + grayG * g + grayB * b;
			r = r * grayFactorInv + gray * grayscaleFactor;
			g = g * grayFactorInv + gray * grayscaleFactor;
			b = b * grayFactorInv + gray * grayscaleFactor;
		}

		if (applySepia) {
			const tr = 0.393 * r + 0.769 * g + 0.189 * b;
			const tg = 0.349 * r + 0.686 * g + 0.168 * b;
			const tb = 0.272 * r + 0.534 * g + 0.131 * b;
			r = r * sepiaFactorInv + tr * sepiaFactor;
			g = g * sepiaFactorInv + tg * sepiaFactor;
			b = b * sepiaFactorInv + tb * sepiaFactor;
		}

		if (applyInvert) {
			r = r * invertFactorInv + (255 - r) * invertFactor;
			g = g * invertFactorInv + (255 - g) * invertFactor;
			b = b * invertFactorInv + (255 - b) * invertFactor;
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

// !TODO: Implement dithering methods
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

// Applies a simple sharpening filter to an image using a 3x3 kernel.
function applySharpness(imageData: ImageData, amount: number): ImageData {
	const data = imageData.data;
	const { width, height } = imageData;
	const newData = new Uint8ClampedArray(data);
	const factor = amount / 10;
	const centerWeight = 1 + 4 * factor;

	// Iterate over each pixel
	for (let y = 1; y < height - 1; y++) {
		const yOffset = y * width;
		const yTopOffset = (y - 1) * width;
		const yBottomOffset = (y + 1) * width;

		// Iterate over each pixel in the row
		for (let x = 1; x < width - 1; x++) {
			const idx = (yOffset + x) * 4;
			const idxTop = (yTopOffset + x) * 4;
			const idxBottom = (yBottomOffset + x) * 4;
			const idxLeft = (yOffset + (x - 1)) * 4;
			const idxRight = (yOffset + (x + 1)) * 4;

			// Iterate over each color channel
			for (let c = 0; c < 3; c++) {
				const center = data[idx + c];
				const top = data[idxTop + c];
				const bottom = data[idxBottom + c];
				const left = data[idxLeft + c];
				const right = data[idxRight + c];
				const sharpened = center * centerWeight - (top + bottom + left + right) * factor;
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
	const factor = (strength - 1) / 10;

	for (let y = 1; y < height - 1; y++) {
		const yOffset = y * width;
		const yTopOffset = (y - 1) * width;
		const yBottomOffset = (y + 1) * width;

		for (let x = 1; x < width - 1; x++) {
			const idx = (yOffset + x) * 4;

			// Pre-calculate all 8 neighbor indices
			const idxTL = (yTopOffset + (x - 1)) * 4;
			const idxT = (yTopOffset + x) * 4;
			const idxTR = (yTopOffset + (x + 1)) * 4;
			const idxL = (yOffset + (x - 1)) * 4;
			const idxR = (yOffset + (x + 1)) * 4;
			const idxBL = (yBottomOffset + (x - 1)) * 4;
			const idxB = (yBottomOffset + x) * 4;
			const idxBR = (yBottomOffset + (x + 1)) * 4;

			for (let c = 0; c < 3; c++) {
				// Sobel X gradient
				const gx =
					-1 * data[idxTL + c] +
					1 * data[idxTR + c] +
					-2 * data[idxL + c] +
					2 * data[idxR + c] +
					-1 * data[idxBL + c] +
					1 * data[idxBR + c];

				// Sobel Y gradient
				const gy =
					-1 * data[idxTL + c] +
					-2 * data[idxT + c] +
					-1 * data[idxTR + c] +
					1 * data[idxBL + c] +
					2 * data[idxB + c] +
					1 * data[idxBR + c];

				const magnitude = Math.sqrt(gx * gx + gy * gy);
				newData[idx + c] = clampColor(data[idx + c] + magnitude * factor);
			}
		}
	}

	return new ImageData(newData, width, height);
}

function applyThreshold(imageData: ImageData, threshold: number): ImageData {
	const data = imageData.data;
	const dataLength = data.length;

	// Use same perceptual luminance weights for consistency
	const lumR = 0.299;
	const lumG = 0.587;
	const lumB = 0.114;

	for (let i = 0; i < dataLength; i += 4) {
		const gray = lumR * data[i] + lumG * data[i + 1] + lumB * data[i + 2];
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
