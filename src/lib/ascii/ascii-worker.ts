/// <reference lib="webworker" />
import init from './gifski-wasm-module.js';
import UPNG from 'upng-js';

import type { ConvertedAsciiFrame } from './converter';
import { applyDithering, applyImageFilters } from './effects';
import { ASCII_GRADIENTS, DITHERING_METHODS } from './constants';
import {
	WorkerMessageType,
	// type WorkerRequest,
	type WorkerResponse,
	type ConvertImageRequest,
	type ConvertAnimationRequest,
	type ExportGifRequest,
	type ExportApngRequest
} from './worker-types';
import { classifyError, type WasmError, type WasmErrorContext } from './error-types';

// Worker global scope
const ctx: Worker = self as unknown as Worker;

let isCancelled = false;

// Handle uncaught errors
ctx.addEventListener('error', (event: ErrorEvent) => {
	console.error('[Worker] Uncaught error:', event.error || event.message);
});

// Handle unhandled promise rejections (kinda annoying in WASM)
ctx.addEventListener('unhandledrejection', (event: Event) => {
	console.error('[Worker] Unhandled promise rejection:', (event as PromiseRejectionEvent).reason);
});

/**
 * Main message handler for worker
 */
ctx.addEventListener('message', (event: MessageEvent) => {
	const message = event.data;

	if (!message || typeof message !== 'object' || !('type' in message) || !('id' in message)) {
		return;
	}

	const { type, id } = message as { type: string; id: string };

	switch (type) {
		case WorkerMessageType.CONVERT_IMAGE:
			handleConvertImage(message as ConvertImageRequest);
			break;
		case WorkerMessageType.CONVERT_ANIMATION:
			handleConvertAnimation(message as ConvertAnimationRequest);
			break;
		case WorkerMessageType.EXPORT_GIF:
			handleExportGif(message as ExportGifRequest);
			break;
		case WorkerMessageType.EXPORT_APNG:
			handleExportApng(message as ExportApngRequest);
			break;
		case WorkerMessageType.CANCEL:
			handleCancel();
			break;
		default:
			sendError(id, `Unknown message type`);
	}
});

/**
 * Handle single image conversion
 */
async function handleConvertImage(request: ConvertImageRequest): Promise<void> {
	isCancelled = false;

	try {
		const { imageData, controls } = request.payload;
		const { selectedGradient, spaceDensity, ditheringMethod } = controls;

		// Apply filters
		let processedData = applyImageFilters(imageData, controls);

		// Apply dithering
		const ditheringValue = DITHERING_METHODS[ditheringMethod];
		if (ditheringValue && ditheringValue !== 'none') {
			processedData = applyDithering(processedData, ditheringMethod);
		}

		if (isCancelled) return;

		// Convert to ASCII
		const gradient = ASCII_GRADIENTS[selectedGradient];
		const asciiOutput = convertPixelsToAscii({
			imageData: processedData,
			gradient,
			width: imageData.width,
			height: imageData.height,
			spaceDensity
		});

		if (isCancelled) return;

		sendComplete(request.id, { asciiOutput });
	} catch (error) {
		sendError(request.id, error instanceof Error ? error.message : 'Failed to convert image');
	}
}

/**
 * Handle animation conversion
 */
async function handleConvertAnimation(request: ConvertAnimationRequest): Promise<void> {
	isCancelled = false;

	try {
		const { animationInfo, controls } = request.payload;
		const {
			selectedGradient,
			spaceDensity,
			ditheringMethod,
			animationFrameLimit,
			animationFrameSkip,
			animationPlaybackSpeed
		} = controls;

		const gradient = ASCII_GRADIENTS[selectedGradient];
		const asciiFrames: ConvertedAsciiFrame[] = [];

		const normalizedLimit = Number.isFinite(animationFrameLimit)
			? animationFrameLimit
			: animationInfo.frames.length;
		const normalizedSkip = Number.isFinite(animationFrameSkip) ? animationFrameSkip : 1;
		const normalizedSpeed = Number.isFinite(animationPlaybackSpeed) ? animationPlaybackSpeed : 1;

		const frameLimit = Math.max(
			1,
			Math.min(animationInfo.frames.length, Math.floor(normalizedLimit))
		);
		const frameSkip = Math.max(1, Math.floor(normalizedSkip));
		const playbackSpeed = Math.max(0.1, normalizedSpeed);

		let processedFrames = 0;
		const aspectRatio = animationInfo.height / animationInfo.width;
		const width = controls.characters;
		const height = Math.max(1, Math.floor(width * aspectRatio * 0.5));

		// Try to use OffscreenCanvas if available
		const useOffscreen = typeof OffscreenCanvas !== 'undefined';
		let canvas: OffscreenCanvas | null = null;
		let ctx: OffscreenCanvasRenderingContext2D | null = null;
		let tempCanvas: OffscreenCanvas | null = null;
		let tempCtx: OffscreenCanvasRenderingContext2D | null = null;

		if (useOffscreen) {
			canvas = new OffscreenCanvas(width, height);
			ctx = canvas.getContext('2d', { willReadFrequently: true });
			tempCanvas = new OffscreenCanvas(animationInfo.width, animationInfo.height);
			tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
		}

		for (let sourceIndex = 0; sourceIndex < animationInfo.frames.length; sourceIndex++) {
			if (isCancelled) return;

			if (processedFrames >= frameLimit) {
				break;
			}
			if (sourceIndex % frameSkip !== 0) {
				continue;
			}

			const frame = animationInfo.frames[sourceIndex];
			let imageData: ImageData;

			if (useOffscreen && ctx && tempCtx) {
				// Use OffscreenCanvas for processing
				tempCtx.putImageData(frame.imageData, 0, 0);
				ctx.clearRect(0, 0, width, height);
				ctx.drawImage(tempCanvas!, 0, 0, width, height);
				imageData = ctx.getImageData(0, 0, width, height);
			} else {
				// Fallback: process ImageData directly (less efficient)
				imageData = resizeImageData(frame.imageData, width, height);
			}

			// Apply filters
			imageData = applyImageFilters(imageData, controls);

			// Apply dithering
			const ditheringValue = DITHERING_METHODS[ditheringMethod];
			if (ditheringValue && ditheringValue !== 'none') {
				imageData = applyDithering(imageData, ditheringMethod);
			}

			// Convert to ASCII
			const ascii = convertPixelsToAscii({
				imageData,
				gradient,
				width,
				height,
				spaceDensity
			});

			const originalDelay =
				typeof frame.delay === 'number' && !Number.isNaN(frame.delay) ? frame.delay : 100;
			const adjustedDelay = Math.max(16, Math.round(originalDelay / playbackSpeed));

			asciiFrames.push({ ascii, delay: adjustedDelay });
			processedFrames++;

			// Send progress update every 5 frames
			if (processedFrames % 5 === 0) {
				sendProgress(request.id, (processedFrames / frameLimit) * 100, processedFrames, frameLimit);
			}
		}

		// Fallback frame if no frames were processed
		if (asciiFrames.length === 0 && animationInfo.frames.length > 0) {
			const fallbackFrame = animationInfo.frames[0];
			let imageData: ImageData;

			if (useOffscreen && ctx && tempCtx) {
				tempCtx.putImageData(fallbackFrame.imageData, 0, 0);
				ctx.clearRect(0, 0, width, height);
				ctx.drawImage(tempCanvas!, 0, 0, width, height);
				imageData = ctx.getImageData(0, 0, width, height);
			} else {
				imageData = resizeImageData(fallbackFrame.imageData, width, height);
			}

			imageData = applyImageFilters(imageData, controls);
			const ditheringValue = DITHERING_METHODS[ditheringMethod];
			if (ditheringValue && ditheringValue !== 'none') {
				imageData = applyDithering(imageData, ditheringMethod);
			}

			const ascii = convertPixelsToAscii({
				imageData,
				gradient,
				width,
				height,
				spaceDensity
			});
			asciiFrames.push({ ascii, delay: 100 });
		}

		if (isCancelled) return;

		sendComplete(request.id, { asciiFrames });
	} catch (error) {
		sendError(request.id, error instanceof Error ? error.message : 'Failed to convert animation');
	}
}

/**
 * Handle cancellation request
 */
function handleCancel(): void {
	isCancelled = true;
}

/**
 * Send completion response
 */
function sendComplete(
	id: string,
	payload: { asciiOutput?: string; asciiFrames?: ConvertedAsciiFrame[]; blob?: Blob }
): void {
	const response: WorkerResponse = {
		type: WorkerMessageType.CONVERSION_COMPLETE,
		id,
		payload
	};
	ctx.postMessage(response);
}

/**
 * Send error response
 */
function sendError(id: string, error: string): void {
	const response: WorkerResponse = {
		type: WorkerMessageType.CONVERSION_ERROR,
		id,
		payload: { error }
	};
	ctx.postMessage(response);
}

/**
 * Send structured WASM error response
 */
function sendWasmError(id: string, wasmError: WasmError): void {
	const wasmResponse: WorkerResponse = {
		type: WorkerMessageType.WASM_ERROR,
		id,
		payload: { wasmError }
	};
	ctx.postMessage(wasmResponse);

	// send as regular error for rejection
	const errorResponse: WorkerResponse = {
		type: WorkerMessageType.CONVERSION_ERROR,
		id,
		payload: {
			error: wasmError.message,
			wasmError
		}
	};
	ctx.postMessage(errorResponse);
}

/**
 * Send progress update
 */
function sendProgress(
	id: string,
	progress: number,
	currentFrame?: number,
	totalFrames?: number
): void {
	const response: WorkerResponse = {
		type: WorkerMessageType.CONVERSION_PROGRESS,
		id,
		payload: { progress, currentFrame, totalFrames }
	};
	ctx.postMessage(response);
}

/**
 * Fallback function to resize ImageData without canvas
 * This is less efficient but works when OffscreenCanvas is not available
 */
function resizeImageData(source: ImageData, targetWidth: number, targetHeight: number): ImageData {
	const result = new ImageData(targetWidth, targetHeight);
	const xRatio = source.width / targetWidth;
	const yRatio = source.height / targetHeight;
	const srcData = source.data;
	const dstData = result.data;
	const srcWidth = source.width;

	for (let y = 0; y < targetHeight; y++) {
		const srcY = Math.floor(y * yRatio);
		const srcYOffset = srcY * srcWidth;

		for (let x = 0; x < targetWidth; x++) {
			const srcX = Math.floor(x * xRatio);
			const srcIdx = (srcYOffset + srcX) * 4;
			const dstIdx = (y * targetWidth + x) * 4;

			// Batch copy RGBA values
			dstData[dstIdx] = srcData[srcIdx];
			dstData[dstIdx + 1] = srcData[srcIdx + 1];
			dstData[dstIdx + 2] = srcData[srcIdx + 2];
			dstData[dstIdx + 3] = srcData[srcIdx + 3];
		}
	}

	return result;
}

/**
 * Extract the convertPixelsToAscii function to be used in worker
 * This is a copy of the function from converter.ts to avoid DOM dependencies
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
	// Array for building the final string
	const parts: string[] = [];
	const data = imageData.data;

	// Pre-calc gradient length
	const gradientLength = gradient.length;
	const gradientMax = gradientLength - 1;

	// Pre-calc space density check
	const checkSpaceDensity = spaceDensity < 1;
	const fallbackChar = gradient[1] || '.';

	// Pre-calc luminance weights, see: https://en.wikipedia.org/wiki/Luminance_(relative)
	// To get an idea of why these values are used
	const lumR = 0.299;
	const lumG = 0.587;
	const lumB = 0.114;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const r = data[idx];
			const g = data[idx + 1];
			const b = data[idx + 2];

			// Calculate brightness using pre-calc weights
			const brightness = lumR * r + lumG * g + lumB * b;
			const charIndex = Math.floor((brightness / 255) * gradientMax);
			let char = gradient[charIndex];

			// If space density is enabled and the pixel is a space,
			// replace it with a fallback character with a random chance of spaceDensity
			if (char === ' ' && checkSpaceDensity && Math.random() > spaceDensity) {
				char = fallbackChar;
			}

			//  Now we add the color and character to the parts array
			parts.push(`<span style="color: rgb(${r}, ${g}, ${b})">${char}</span>`);
		}
		parts.push('\n');
	}

	return parts.join('');
}

/**
 * Handles the export of a GIF from the worker thread
 */
// Import local WASM module functions
import { encode, initThreadPool } from './gifski-wasm-module.js';

/**
 * Handles the export of a GIF from the worker thread
 */
async function handleExportGif(request: ExportGifRequest): Promise<void> {
	isCancelled = false;

	try {
		console.log('[Worker] Starting GIF export...');
		const { frames, delays, width, height, repeat, quality } = request.payload;

		// Estimate memory usage for error context
		const totalPixels = width * height;
		const estimatedMemoryMB = (frames.length * totalPixels * 4) / (1024 * 1024);
		console.log(`[Worker] Estimated memory usage: ${estimatedMemoryMB.toFixed(2)}MB`);
		console.log(
			`[Worker] Export settings: ${frames.length} frames at ${width}×${height}, quality ${quality}`
		);

		// Create error context for potential WASM errors
		const errorContext: WasmErrorContext = {
			frameCount: frames.length,
			width,
			height,
			quality,
			estimatedMemoryMB,
			operation: 'GIF Export'
		};

		// Cancel check
		if (isCancelled) return;

		// Manually initialize WASM to ensure correct path
		try {
			// Import the WASM file URL directly - Vite will handle the asset path
			const wasmUrl = (await import('./gifski_wasm_bg.wasm?url')).default;
			await init(wasmUrl);
			console.log('[Worker] Manually initialized gifski-wasm');
		} catch (e) {
			console.warn(
				'[Worker] Failed to manually initialize gifski-wasm (might already be initialized):',
				e
			);
		}

		console.log(`[Worker] Encoding ${frames.length} frames with gifski-wasm`);
		console.log(`[Worker] Dimensions: ${width}x${height}, Quality: ${quality || 60}`);
		const startTime = performance.now();

		// Clamp quality to safe range
		const safeQuality = Math.min(90, Math.max(60, quality || 60));

		// Validate frame data
		const expectedFrameSize = width * height * 4;
		for (let i = 0; i < frames.length; i++) {
			if (frames[i].byteLength !== expectedFrameSize) {
				throw new Error(
					`Frame ${i} has invalid size (${frames[i].byteLength} bytes, expected ${expectedFrameSize}). ` +
						`This may indicate corrupted frame data.`
				);
			}
		}

		// ? Not sure why but anything above 150MB is crashing the wasm encoder for multi-threaded encoding...
		// ? for now, I just use single-threaded encoding if the estimated memory usage is above 150MB.
		// TODO: fix this or debug it
		const MEMORY_THRESHOLD_MB = 150;
		const finalWidth = width;
		const finalHeight = height;
		const finalFrames = frames;

		if (estimatedMemoryMB > MEMORY_THRESHOLD_MB) {
			console.warn('[Worker] High memory usage detected, using single-threaded encoding.');
		}

		// Prepare data
		const totalSize = finalFrames.reduce((acc, frame) => acc + frame.byteLength, 0);
		const allFrames = new Uint8Array(totalSize);
		let offset = 0;
		for (const frame of finalFrames) {
			allFrames.set(new Uint8Array(frame), offset);
			offset += frame.byteLength;
		}

		// Prepare frame durations
		const frameDurations = new Uint32Array(delays);

		let result: Uint8Array | undefined;

		// Use single-threaded encoding if the memory usage is above 150MB
		const shouldUseSingleThread = estimatedMemoryMB > MEMORY_THRESHOLD_MB;

		if (shouldUseSingleThread) {
			console.log(`[Worker] Using single-threaded encoder`);
		} else {
			console.log('[Worker] Using multi-threaded encoder');
			try {
				// Initialize thread pool if multi-threaded encoding is used
				const numThreads = navigator.hardwareConcurrency || 4;
				await initThreadPool(numThreads);
				console.log(`[Worker] Thread pool initialized with ${numThreads} threads`);
			} catch (e) {
				console.warn(
					'[Worker] Failed to initialize thread pool (might be single-threaded env):',
					e
				);
			}
		}

		try {
			// Call the encode function
			result = encode(
				allFrames,
				finalFrames.length,
				finalWidth,
				finalHeight,
				undefined,
				frameDurations,
				safeQuality,
				repeat === 0 ? 0 : repeat,
				undefined,
				undefined
			);

			console.log('[Worker] encode() returned result');
		} catch (error: unknown) {
			const errorType = classifyError(error);
			const wasmError: WasmError = {
				type: errorType,
				message: error instanceof Error ? error.message : String(error),
				context: errorContext,
				timestamp: Date.now(),
				originalError: String(error)
			};
			sendWasmError(request.id, wasmError);
			throw error;
		}

		if (!result) {
			throw new Error('Encoding failed: no result returned');
		}

		const duration = performance.now() - startTime;
		console.log(`[Worker] GIF encoding complete in ${duration.toFixed(2)}ms`);

		if (isCancelled) return;

		sendProgress(request.id, 100, frames.length, frames.length);

		const resultBlob = new Blob([result.buffer as ArrayBuffer], { type: 'image/gif' });
		sendComplete(request.id, { blob: resultBlob });
	} catch (error) {
		console.error('[Worker] GIF export failed:', error);
		sendError(request.id, error instanceof Error ? error.message : 'Failed to export GIF');
	}
}

/**
 * Handles the export of an APNG from the worker thread
 */
async function handleExportApng(request: ExportApngRequest): Promise<void> {
	isCancelled = false;

	try {
		const { frames, delays, width, height, quality } = request.payload;

		if (isCancelled) return;

		sendProgress(request.id, 0, 0, frames.length);
		const cnum = quality === undefined || quality === 0 ? 0 : Math.max(1, Math.min(256, quality));
		const chunkSize = Math.max(1, Math.floor(frames.length / 10));

		for (let i = 0; i < frames.length; i += chunkSize) {
			if (isCancelled) return;
			const progress = Math.min(85, (i / frames.length) * 85);
			sendProgress(request.id, progress, i, frames.length);
			await new Promise((resolve) => setTimeout(resolve, 0));
		}

		if (isCancelled) return;

		sendProgress(request.id, 85, frames.length, frames.length);
		const encoded = UPNG.encode(frames, width, height, cnum, delays);

		if (isCancelled) return;
		sendProgress(request.id, 100, frames.length, frames.length);
		const blob = new Blob([encoded], { type: 'image/apng' });
		sendComplete(request.id, { blob });
	} catch (error) {
		sendError(request.id, error instanceof Error ? error.message : 'Failed to export APNG');
	}
}
