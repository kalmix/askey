import {
	convertAnimationToAscii,
	convertImageToAscii,
	type ConvertedAsciiFrame
} from '$lib/ascii/converter';
import { extractApngFrames, extractGifFrames } from '$lib/ascii/animation';
import { getWorkerManager } from '$lib/ascii/worker-manager';
import type { ControlState } from '$lib/ascii/constants';

export type AnimationFormat = 'gif' | 'apng' | 'none';

export interface ConversionRequest {
	imageUrl: string;
	controls: ControlState;
	animation: {
		isAnimatedImage: boolean;
		format: AnimationFormat;
		file: File | null;
	};
}

export interface ConversionResponse {
	asciiOutput: string;
	asciiFrames: ConvertedAsciiFrame[];
}

/**
 * Convert source image/animation to ASCII
 * Uses WebWorker when available, falls back to main thread
 */
export async function convertSourceToAscii({
	imageUrl,
	controls,
	animation
}: ConversionRequest): Promise<ConversionResponse> {
	if (!imageUrl) {
		return { asciiOutput: '', asciiFrames: [] };
	}

	if (animation.isAnimatedImage && animation.file) {
		return await convertAnimationWithWorker(imageUrl, animation, controls);
	}

	return await convertImageWithWorker(imageUrl, controls);
}

/**
 * Convert single image using worker or fallback
 */
async function convertImageWithWorker(
	imageUrl: string,
	controls: ControlState
): Promise<ConversionResponse> {
	const workerManager = getWorkerManager();

	try {
		// Try to use worker
		await workerManager.initialize();

		// Load image and get ImageData
		const imageData = await loadImageAsImageData(imageUrl, controls.characters);

		// Convert using worker
		const asciiOutput = await workerManager.convertImage(imageData, {
			...controls,
			spaceDensity: controls.spaceDensity
		});

		return { asciiOutput, asciiFrames: [] };
	} catch (error) {
		// Fallback to main thread
		console.warn('Worker conversion failed, falling back to main thread:', error);

		const ascii = await convertImageToAscii({
			imageUrl,
			characters: controls.characters,
			brightness: controls.brightness,
			contrast: controls.contrast,
			saturation: controls.saturation,
			hue: controls.hue,
			grayscale: controls.grayscale,
			sepia: controls.sepia,
			invertColors: controls.invertColors,
			thresholding: controls.thresholding,
			sharpness: controls.sharpness,
			edgeDetection: controls.edgeDetection,
			spaceDensity: controls.spaceDensity,
			selectedGradient: controls.selectedGradient,
			ditheringMethod: controls.ditheringMethod
		});

		return { asciiOutput: ascii, asciiFrames: [] };
	}
}

/**
 * Convert animation using worker or fallback
 */
async function convertAnimationWithWorker(
	imageUrl: string,
	animation: { format: AnimationFormat; file: File | null },
	controls: ControlState
): Promise<ConversionResponse> {
	let animInfo;
	if (animation.format === 'gif' && animation.file) {
		animInfo = await extractGifFrames(animation.file);
	} else if (animation.format === 'apng' && animation.file) {
		animInfo = await extractApngFrames(animation.file);
	}

	if (!animInfo || animInfo.frames.length === 0) {
		throw new Error('Failed to extract frames from the animation.');
	}

	const workerManager = getWorkerManager();

	try {
		// Try to use worker
		await workerManager.initialize();

		// Convert using worker
		const frames = await workerManager.convertAnimation(animInfo, {
			...controls,
			spaceDensity: controls.spaceDensity,
			animationFrameLimit: controls.animationFrameLimit,
			animationFrameSkip: controls.animationFrameSkip,
			animationPlaybackSpeed: controls.animationPlaybackSpeed
		});

		if (!frames.length) {
			throw new Error('Failed to convert animation frames to ASCII.');
		}

		return {
			asciiFrames: frames,
			asciiOutput: frames[0]?.ascii ?? ''
		};
	} catch (error) {
		// Fallback to main thread
		console.warn('Worker animation conversion failed, falling back to main thread:', error);

		const frames = await convertAnimationToAscii(animInfo, controls);

		if (!frames.length) {
			throw new Error('Failed to convert animation frames to ASCII.');
		}

		return {
			asciiFrames: frames,
			asciiOutput: frames[0]?.ascii ?? ''
		};
	}
}

/**
 * Load image and convert to ImageData for worker processing
 */
async function loadImageAsImageData(imageUrl: string, targetWidth: number): Promise<ImageData> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';

		img.onload = () => {
			const aspectRatio = img.height / img.width;
			const width = targetWidth;
			const height = Math.max(1, Math.floor(width * aspectRatio * 0.5));

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d', { willReadFrequently: true });
			if (!ctx) {
				reject(new Error('Unable to acquire 2D context'));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);
			const imageData = ctx.getImageData(0, 0, width, height);
			resolve(imageData);
		};

		img.onerror = () => {
			reject(new Error('Failed to load image'));
		};

		img.src = imageUrl;
	});
}
