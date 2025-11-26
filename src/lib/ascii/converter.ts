// This is one of the main files of the project so you'll mostly find detailed docstrings/comments here
import { ASCII_GRADIENTS, DITHERING_METHODS } from './constants';
import { applyDithering, applyImageFilters } from './effects';
import type { AsciiControlValues } from './types';
import type { AnimationInfo } from './animation';

export interface ConvertedAsciiFrame {
	ascii: string;
	delay: number;
}

export interface ConvertImageParams extends AsciiControlValues {
	imageUrl: string;
	spaceDensity: number;
}

/**
 * Converts a static image to ASCII art.
 *
 * @param params - Conversion parameters including image URL, character count, gradient, space density, and dithering method
 * @returns Promise resolving to a string of ASCII art
 *
 * @example
 * ```typescript
 * const asciiArt = await convertImageToAscii({
 *   imageUrl: dataUrl,
 *   characters: 80,
 *   selectedGradient: 'standard',
 *   spaceDensity: 1.0,
 *   ditheringMethod: 'none'
 * });
 * ```
 */
export async function convertImageToAscii(params: ConvertImageParams): Promise<string> {
	const { imageUrl, characters, selectedGradient, spaceDensity, ditheringMethod } = params;

	// First, load the image from the URL and
	// check if we can get the 2D context
	const img = await loadImage(imageUrl);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('Unable to acquire 2D context');

	// Calculate the dimensions of the canvas based on the number of characters
	const aspectRatio = img.height / img.width;
	const width = characters;
	const height = Math.max(1, Math.floor(width * aspectRatio * 0.5));
	canvas.width = width;
	canvas.height = height;

	// Draw the image on the canvas
	ctx.drawImage(img, 0, 0, width, height);
	let imageData = ctx.getImageData(0, 0, width, height);

	// Apply image filters
	imageData = applyImageFilters(imageData, params);

	// !TODO: Yeah I need to do this later...
	const ditheringValue = DITHERING_METHODS[ditheringMethod];
	if (ditheringValue && ditheringValue !== 'none') {
		imageData = applyDithering(imageData, ditheringMethod);
	}

	const gradient = ASCII_GRADIENTS[selectedGradient];
	return convertPixelsToAscii({ imageData, gradient, width, height, spaceDensity });
}
export interface ConvertAnimationOptions extends Omit<ConvertImageParams, 'imageUrl'> {
	animationFrameLimit: number;
	animationFrameSkip: number;
	animationPlaybackSpeed: number;
}

/**
 * Converts an animated image (GIF/APNG) to a series of ASCII art frames.
 *
 * Processes animation frames with optional frame limiting, skipping, and speed adjustment.
 * Applies all image filters and effects to each frame consistently.
 *
 * @param animInfo - Animation metadata including frames and dimensions
 * @param params - Conversion options including character count, filters, and animation settings
 * @returns Promise resolving to an array of ASCII frames with timing information
 *
 * @remarks
 * - Frame limit and skip values are clamped to safe ranges
 * - Playback speed is clamped to minimum 0.1x
 * - Frame delays are adjusted based on playback speed with minimum 16ms (60fps cap)
 * - Returns at least one frame even if frame limit/skip would exclude all frames
 *
 * @example
 * ```typescript
 * const frames = await convertAnimationToAscii(animationInfo, {
 *   characters: 80,
 *   selectedGradient: 'standard',
 *   spaceDensity: 1.0,
 *   animationFrameLimit: 50,
 *   animationFrameSkip: 1,
 *   animationPlaybackSpeed: 1.0,
 *   // ... other values
 * });
 * ```
 */
export async function convertAnimationToAscii(
	animInfo: AnimationInfo,
	params: ConvertAnimationOptions
): Promise<ConvertedAsciiFrame[]> {
	const {
		characters,
		selectedGradient,
		spaceDensity,
		ditheringMethod,
		animationFrameLimit,
		animationFrameSkip,
		animationPlaybackSpeed
	} = params;
	const gradient = ASCII_GRADIENTS[selectedGradient];
	const asciiFrames: ConvertedAsciiFrame[] = [];
	const normalizedLimit = Number.isFinite(animationFrameLimit)
		? animationFrameLimit
		: animInfo.frames.length;
	const normalizedSkip = Number.isFinite(animationFrameSkip) ? animationFrameSkip : 1;
	const normalizedSpeed = Number.isFinite(animationPlaybackSpeed) ? animationPlaybackSpeed : 1;
	const frameLimit = Math.max(1, Math.min(animInfo.frames.length, Math.floor(normalizedLimit)));
	const frameSkip = Math.max(1, Math.floor(normalizedSkip));
	const playbackSpeed = Math.max(0.1, normalizedSpeed);
	let processedFrames = 0;

	const aspectRatio = animInfo.height / animInfo.width;
	const width = characters;
	const height = Math.max(1, Math.floor(width * aspectRatio * 0.5));

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	const tempCanvas = document.createElement('canvas');
	const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

	if (!ctx || !tempCtx) {
		return asciiFrames;
	}

	canvas.width = width;
	canvas.height = height;
	tempCanvas.width = animInfo.width;
	tempCanvas.height = animInfo.height;

	for (let sourceIndex = 0; sourceIndex < animInfo.frames.length; sourceIndex++) {
		if (processedFrames >= frameLimit) {
			break;
		}
		if (sourceIndex % frameSkip !== 0) {
			continue;
		}

		const frame = animInfo.frames[sourceIndex];

		tempCtx.putImageData(frame.imageData, 0, 0);
		ctx.clearRect(0, 0, width, height);
		ctx.drawImage(tempCanvas, 0, 0, width, height);
		let imageData = ctx.getImageData(0, 0, width, height);

		imageData = applyImageFilters(imageData, {
			brightness: params.brightness,
			contrast: params.contrast,
			saturation: params.saturation,
			hue: params.hue,
			grayscale: params.grayscale,
			sepia: params.sepia,
			invertColors: params.invertColors,
			thresholding: params.thresholding,
			sharpness: params.sharpness,
			edgeDetection: params.edgeDetection,
			ditheringMethod: params.ditheringMethod
		});

		const ditheringValue = DITHERING_METHODS[ditheringMethod];
		if (ditheringValue && ditheringValue !== 'none') {
			imageData = applyDithering(imageData, ditheringMethod);
		}

		const ascii = convertPixelsToAscii({ imageData, gradient, width, height, spaceDensity });
		const originalDelay =
			typeof frame.delay === 'number' && !Number.isNaN(frame.delay) ? frame.delay : 100;
		const adjustedDelay = Math.max(16, Math.round(originalDelay / playbackSpeed));
		asciiFrames.push({ ascii, delay: adjustedDelay });
		processedFrames++;
	}

	if (asciiFrames.length === 0 && animInfo.frames.length > 0) {
		const fallbackFrame = animInfo.frames[0];
		// Reuse the same canvases for fallback
		tempCtx.putImageData(fallbackFrame.imageData, 0, 0);
		ctx.clearRect(0, 0, width, height);
		ctx.drawImage(tempCanvas, 0, 0, width, height);
		let imageData = ctx.getImageData(0, 0, width, height);
		imageData = applyImageFilters(imageData, {
			brightness: params.brightness,
			contrast: params.contrast,
			saturation: params.saturation,
			hue: params.hue,
			grayscale: params.grayscale,
			sepia: params.sepia,
			invertColors: params.invertColors,
			thresholding: params.thresholding,
			sharpness: params.sharpness,
			edgeDetection: params.edgeDetection,
			ditheringMethod: params.ditheringMethod
		});
		const ditheringValue = DITHERING_METHODS[ditheringMethod];
		if (ditheringValue && ditheringValue !== 'none') {
			imageData = applyDithering(imageData, ditheringMethod);
		}
		const ascii = convertPixelsToAscii({ imageData, gradient, width, height, spaceDensity });
		asciiFrames.push({ ascii, delay: 100 });
	}

	return asciiFrames;
}

/**
 * Converts pixel data to colored ASCII art using brightness mapping.
 *
 * Maps each pixel to an ASCII character based on its brightness value,
 * preserving the original color as inline CSS styles.
 *
 * @param params - Conversion parameters
 * @param params.imageData - Canvas ImageData containing pixel information
 * @param params.gradient - String of ASCII characters ordered from dark to light
 * @param params.width - Width of the image in characters
 * @param params.height - Height of the image in characters
 * @param params.spaceDensity - Probability (0-1) of keeping space characters
 * @returns HTML string with colored ASCII art using span elements
 *
 * @remarks
 * - Brightness is calculated as simple average of RGB values
 * - Each character is wrapped in a span with inline color style
 * - Space characters may be randomly replaced based on spaceDensity
 * - Lower spaceDensity values result in fewer spaces (denser output)
 */
function convertPixelsToAscii({
	imageData,
	gradient,
	width,
	height,
	spaceDensity
}: {
	imageData: ImageData;
	gradient: string;
	width: number;
	height: number;
	spaceDensity: number;
}): string {
	// Use array building for better performance
	const parts: string[] = [];
	const data = imageData.data;

	// Pre-calculate gradient length to avoid repeated property access
	const gradientLength = gradient.length;
	const gradientMax = gradientLength - 1;

	// Pre-calculate space density check
	const checkSpaceDensity = spaceDensity < 1;
	const fallbackChar = gradient[1] || '.';

	// Use perceptual luminance weights for more accurate brightness
	// This produces better visual results than simple RGB average
	// Read here for more info: https://en.wikipedia.org/wiki/Rec._601
	// And: https://en.wikipedia.org/wiki/Luma_(video)

	// You can play around with these values to get different results
	const lumR = 0.299;
	const lumG = 0.587;
	const lumB = 0.114;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const r = data[idx];
			const g = data[idx + 1];
			const b = data[idx + 2];

			// Use perceptual luminance instead of simple average
			const brightness = lumR * r + lumG * g + lumB * b;
			const charIndex = Math.floor((brightness / 255) * gradientMax);
			let char = gradient[charIndex];

			// Optimize space density check
			if (char === ' ' && checkSpaceDensity && Math.random() > spaceDensity) {
				char = fallbackChar;
			}

			// Finally we push the span to the array with the character and the color
			parts.push(`<span style="color: rgb(${r}, ${g}, ${b})">${char}</span>`);
		}
		parts.push('\n');
	}

	return parts.join('');
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.onload = () => resolve(image);
		// If the image fails to load, reject the promise
		image.onerror = () =>
			reject(
				new Error('Failed to load image. The file may be corrupted or in an unsupported format.')
			);
		image.src = src;
	});
}
