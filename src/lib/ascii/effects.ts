import type { DitheringName, PaletteName } from './constants';
import { RETRO_PALETTES } from './constants';
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
	colorPalette?: 'None' | PaletteName;
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
		edgeDetection,
		colorPalette
	} = options;

	let processed = new ImageData(
		new Uint8ClampedArray(imageData.data),
		imageData.width,
		imageData.height
	);

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

	const data = processed.data;

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

	if (sharpness !== 0) {
		processed = applySharpness(processed, sharpness);
	}

	if (edgeDetection > 1) {
		processed = applyEdgeDetection(processed, edgeDetection);
	}

	if (thresholding !== 128) {
		processed = applyThreshold(processed, thresholding);
	}

	if (options.ditheringMethod !== 'None') {
		processed = applyDithering(processed, options.ditheringMethod, colorPalette);
	} else if (colorPalette && colorPalette !== 'None') {
		processed = applyColorPalette(processed, colorPalette);
	}

	return processed;
}

function findNearestColor(
	r: number,
	g: number,
	b: number,
	palette: ReadonlyArray<{ r: number; g: number; b: number }>
) {
	let minDist = Infinity;
	let nearest = palette[0];
	for (let i = 0; i < palette.length; i++) {
		const color = palette[i];
		const dr = r - color.r;
		const dg = g - color.g;
		const db = b - color.b;
		const dist = dr * dr + dg * dg + db * db;
		if (dist < minDist) {
			minDist = dist;
			nearest = color;
		}
	}
	return nearest;
}

export function applyColorPalette(imageData: ImageData, paletteName: PaletteName): ImageData {
	const palette = RETRO_PALETTES[paletteName];
	if (!palette) return imageData;

	const data = imageData.data;
	const { width, height } = imageData;
	const newData = new Uint8ClampedArray(data);

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const nearest = findNearestColor(r, g, b, palette);
		newData[i] = nearest.r;
		newData[i + 1] = nearest.g;
		newData[i + 2] = nearest.b;
	}

	return new ImageData(newData, width, height);
}

export function applyDithering(
	imageData: ImageData,
	method: DitheringName,
	paletteName?: 'None' | PaletteName
): ImageData {
	if (method === 'None') {
		return imageData;
	}

	switch (method) {
		case 'Floyd-Steinberg':
			return floydSteinberg(imageData, paletteName);
		case 'Atkinson':
			return atkinson(imageData, paletteName);
		case 'Ordered':
			return orderedDithering(imageData, paletteName);
		default:
			return imageData;
	}
}

function applySharpness(imageData: ImageData, amount: number): ImageData {
	const data = imageData.data;
	const { width, height } = imageData;
	const newData = new Uint8ClampedArray(data);
	const factor = amount / 10;
	const centerWeight = 1 + 4 * factor;

	for (let y = 1; y < height - 1; y++) {
		const yOffset = y * width;
		const yTopOffset = (y - 1) * width;
		const yBottomOffset = (y + 1) * width;

		for (let x = 1; x < width - 1; x++) {
			const idx = (yOffset + x) * 4;
			const idxTop = (yTopOffset + x) * 4;
			const idxBottom = (yBottomOffset + x) * 4;
			const idxLeft = (yOffset + (x - 1)) * 4;
			const idxRight = (yOffset + (x + 1)) * 4;

			for (let c = 0; c < 3; c++) {
				const val =
					data[idx + c] * centerWeight -
					factor *
						(data[idxTop + c] + data[idxBottom + c] + data[idxLeft + c] + data[idxRight + c]);
				newData[idx + c] = Math.max(0, Math.min(255, val));
			}
		}
	}

	return new ImageData(newData, width, height);
}

function applyEdgeDetection(imageData: ImageData, strength: number): ImageData {
	const { width, height } = imageData;
	const data = imageData.data;
	const newData = new Uint8ClampedArray(data);
	const factor = strength * 2;

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = (y * width + x) * 4;

			for (let c = 0; c < 3; c++) {
				const val =
					data[idx + c] * 4 -
					data[((y - 1) * width + x) * 4 + c] -
					data[((y + 1) * width + x) * 4 + c] -
					data[(y * width + (x - 1)) * 4 + c] -
					data[(y * width + (x + 1)) * 4 + c];

				const edgeVal = Math.max(0, Math.min(255, Math.abs(val) * factor));
				newData[idx + c] = Math.max(0, Math.min(255, data[idx + c] + edgeVal));
			}
		}
	}

	return new ImageData(newData, width, height);
}

function applyThreshold(imageData: ImageData, threshold: number): ImageData {
	const data = imageData.data;
	const { width, height } = imageData;
	const newData = new Uint8ClampedArray(data);

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
		const val = brightness >= threshold ? 255 : 0;
		newData[i] = val;
		newData[i + 1] = val;
		newData[i + 2] = val;
	}

	return new ImageData(newData, width, height);
}

function floydSteinberg(imageData: ImageData, paletteName?: 'None' | PaletteName): ImageData {
	const { width, height } = imageData;
	const data = new Uint8ClampedArray(imageData.data);
	const palette = paletteName && paletteName !== 'None' ? RETRO_PALETTES[paletteName] : null;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;

			const oldR = data[idx];
			const oldG = data[idx + 1];
			const oldB = data[idx + 2];

			let newR, newG, newB;
			if (palette) {
				const nearest = findNearestColor(oldR, oldG, oldB, palette);
				newR = nearest.r;
				newG = nearest.g;
				newB = nearest.b;
			} else {
				newR = oldR < 128 ? 0 : 255;
				newG = oldG < 128 ? 0 : 255;
				newB = oldB < 128 ? 0 : 255;
			}

			data[idx] = newR;
			data[idx + 1] = newG;
			data[idx + 2] = newB;

			const errR = oldR - newR;
			const errG = oldG - newG;
			const errB = oldB - newB;

			distributeError(data, width, height, x + 1, y, errR, errG, errB, 7 / 16);
			distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
			distributeError(data, width, height, x, y + 1, errR, errG, errB, 5 / 16);
			distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
		}
	}

	return new ImageData(data, width, height);
}

function atkinson(imageData: ImageData, paletteName?: 'None' | PaletteName): ImageData {
	const { width, height } = imageData;
	const data = new Uint8ClampedArray(imageData.data);
	const palette = paletteName && paletteName !== 'None' ? RETRO_PALETTES[paletteName] : null;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;

			const oldR = data[idx];
			const oldG = data[idx + 1];
			const oldB = data[idx + 2];

			let newR, newG, newB;
			if (palette) {
				const nearest = findNearestColor(oldR, oldG, oldB, palette);
				newR = nearest.r;
				newG = nearest.g;
				newB = nearest.b;
			} else {
				newR = oldR < 128 ? 0 : 255;
				newG = oldG < 128 ? 0 : 255;
				newB = oldB < 128 ? 0 : 255;
			}

			data[idx] = newR;
			data[idx + 1] = newG;
			data[idx + 2] = newB;

			const errR = oldR - newR;
			const errG = oldG - newG;
			const errB = oldB - newB;

			distributeError(data, width, height, x + 1, y, errR, errG, errB, 1 / 8);
			distributeError(data, width, height, x + 2, y, errR, errG, errB, 1 / 8);
			distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 1 / 8);
			distributeError(data, width, height, x, y + 1, errR, errG, errB, 1 / 8);
			distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 1 / 8);
			distributeError(data, width, height, x, y + 2, errR, errG, errB, 1 / 8);
		}
	}

	return new ImageData(data, width, height);
}

function orderedDithering(imageData: ImageData, paletteName?: 'None' | PaletteName): ImageData {
	const { width, height } = imageData;
	const data = new Uint8ClampedArray(imageData.data);
	const palette = paletteName && paletteName !== 'None' ? RETRO_PALETTES[paletteName] : null;

	const bayer = [
		[0, 8, 2, 10],
		[12, 4, 14, 6],
		[3, 11, 1, 9],
		[15, 7, 13, 5]
	];

	for (let y = 0; y < height; y++) {
		const bayerRow = bayer[y % 4];
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;

			const threshold = (bayerRow[x % 4] / 16 - 0.5) * 64;

			const r = clampColor(data[idx] + threshold);
			const g = clampColor(data[idx + 1] + threshold);
			const b = clampColor(data[idx + 2] + threshold);

			if (palette) {
				const nearest = findNearestColor(r, g, b, palette);
				data[idx] = nearest.r;
				data[idx + 1] = nearest.g;
				data[idx + 2] = nearest.b;
			} else {
				data[idx] = r > 128 ? 255 : 0;
				data[idx + 1] = g > 128 ? 255 : 0;
				data[idx + 2] = b > 128 ? 255 : 0;
			}
		}
	}

	return new ImageData(data, width, height);
}

function distributeError(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	x: number,
	y: number,
	errR: number,
	errG: number,
	errB: number,
	weight: number
): void {
	if (x < 0 || x >= width || y < 0 || y >= height) return;
	const idx = (y * width + x) * 4;
	data[idx] = clampColor(data[idx] + errR * weight);
	data[idx + 1] = clampColor(data[idx + 1] + errG * weight);
	data[idx + 2] = clampColor(data[idx + 2] + errB * weight);
}

const clampColor = (value: number) => Math.max(0, Math.min(255, value));
