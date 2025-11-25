import { buildSvgContent } from './render';
import { renderToCanvas, renderToImageData } from './canvas-renderer';
import type { ConvertedAsciiFrame } from './converter';
import { getWorkerManager } from './worker-manager';
import type { WasmError } from './error-types';

interface ExportOptions {
	outputElementId?: string;
	transparentBackground?: boolean;
	backgroundColor?: string;
	filename?: string;
}

interface DownloadPngOptions extends ExportOptions {
	scale?: number;
	useCanvasRenderer?: boolean;
}

type DownloadWebpOptions = DownloadPngOptions;

interface DownloadGifOptions extends ExportOptions {
	scale?: number;
	repeat?: number;
	colors?: number;
	useCanvasRenderer?: boolean;
	onProgress?: (progress: number) => void;
	onError?: (error: WasmError) => void;
	signal?: AbortSignal;
}

interface DownloadApngOptions extends ExportOptions {
	scale?: number;
	colors?: number;
	useCanvasRenderer?: boolean;
	onProgress?: (progress: number) => void;
	onError?: (error: WasmError) => void;
	signal?: AbortSignal;
}

function sanitizeFilename(filename: string): string {
	return (
		filename
			.replace(/[<>:"/\\|?*]/g, '_')
			// eslint-disable-next-line no-control-regex
			.replace(/[\x00-\x1F]/g, '_')
			.replace(/^\.+/, '')
			.replace(/\s+/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_|_$/g, '')
			.substring(0, 255)
	);
}

function getBaseFilename(filename: string): string {
	return filename.replace(/\.[^/.]+$/, '');
}

// * Note: For Animations, this will export just the first frame.
export async function copyAsciiToClipboard(elementId = 'ascii-output'): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.clipboard) return;
	const element = document.getElementById(elementId);
	if (!element) return;
	const text = element.textContent ?? '';
	await navigator.clipboard.writeText(text);
}

// * Note: For Animations, this will export just the first frame.
export function downloadAsciiText(asciiOutput: string, sourceFilename?: string): void {
	if (!asciiOutput) return;
	const text = asciiOutput.replace(/<[^>]+>/g, '');
	const blob = new Blob([text], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	const baseName = sourceFilename
		? `${sanitizeFilename(getBaseFilename(sourceFilename))}-ascii`
		: 'ascii-art';
	a.download = `${baseName}.txt`;
	a.click();
	URL.revokeObjectURL(url);
}

export function downloadSvg(asciiOutput: string, theme: string, options: ExportOptions = {}): void {
	const svgData = buildSvgContent({
		asciiOutput,
		theme,
		outputElementId: options.outputElementId,
		transparentBackground: options.transparentBackground,
		backgroundColor: options.backgroundColor
	});
	if (!svgData) return;

	const blob = new Blob([svgData.svg], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	const baseName = options.filename
		? `${sanitizeFilename(getBaseFilename(options.filename))}-ascii`
		: 'ascii-art';
	a.download = `${baseName}.svg`;
	a.click();
	URL.revokeObjectURL(url);
}

export function downloadPng(
	asciiOutput: string,
	theme: string,
	options: DownloadPngOptions = {}
): void {
	// Try canvas renderer first if enabled
	if (options.useCanvasRenderer) {
		try {
			const rendered = renderToCanvas(asciiOutput, {
				transparentBackground: options.transparentBackground,
				backgroundColor: options.backgroundColor
			});

			if (rendered) {
				const scale = options.scale ?? 2;
				const scaledCanvas = document.createElement('canvas');
				scaledCanvas.width = Math.ceil(rendered.width * scale);
				scaledCanvas.height = Math.ceil(rendered.height * scale);

				const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true });
				if (ctx) {
					ctx.imageSmoothingEnabled = false;
					ctx.scale(scale, scale);
					ctx.drawImage(rendered.canvas as HTMLCanvasElement, 0, 0);

					const baseName = options.filename
						? `${sanitizeFilename(getBaseFilename(options.filename))}-ascii`
						: 'ascii-art';

					scaledCanvas.toBlob((blob) => {
						if (!blob) return;
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = `${baseName}.png`;
						a.click();
						URL.revokeObjectURL(url);
					}, 'image/png');

					return; // Success, exit early
				}
			}
		} catch (error) {
			console.warn('Canvas renderer failed, falling back to SVG method:', error);
		}
	}

	// Fallback to SVG method
	const svgData = buildSvgContent({
		asciiOutput,
		theme,
		outputElementId: options.outputElementId,
		transparentBackground: options.transparentBackground,
		backgroundColor: options.backgroundColor
	});
	if (!svgData) return;

	const img = new Image();
	const svgBlob = new Blob([svgData.svg], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(svgBlob);

	img.onload = () => {
		const canvas = document.createElement('canvas');
		const deviceScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		const scale = options.scale ?? Math.max(2, deviceScale);
		canvas.width = Math.ceil(svgData.width * scale);
		canvas.height = Math.ceil(svgData.height * scale);

		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) {
			URL.revokeObjectURL(url);
			return;
		}

		ctx.setTransform(scale, 0, 0, scale, 0, 0);
		ctx.clearRect(0, 0, svgData.width, svgData.height);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, 0, 0, svgData.width, svgData.height);

		const baseName = options.filename
			? `${sanitizeFilename(getBaseFilename(options.filename))}-ascii`
			: 'ascii-art';
		canvas.toBlob((blob) => {
			if (!blob) return;
			const downloadUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = `${baseName}.png`;
			a.click();
			URL.revokeObjectURL(downloadUrl);
		}, 'image/png');

		URL.revokeObjectURL(url);
	};

	img.onerror = () => {
		URL.revokeObjectURL(url);
	};

	img.src = url;
}

export function downloadWebp(
	asciiOutput: string,
	theme: string,
	options: DownloadWebpOptions = {}
): void {
	// Try canvas renderer first
	if (options.useCanvasRenderer) {
		try {
			const rendered = renderToCanvas(asciiOutput, {
				transparentBackground: options.transparentBackground,
				backgroundColor: options.backgroundColor
			});

			if (rendered) {
				const scale = options.scale ?? 2;
				const scaledCanvas = document.createElement('canvas');
				scaledCanvas.width = Math.ceil(rendered.width * scale);
				scaledCanvas.height = Math.ceil(rendered.height * scale);

				const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true });
				if (ctx) {
					ctx.imageSmoothingEnabled = false;
					ctx.scale(scale, scale);
					ctx.drawImage(rendered.canvas as HTMLCanvasElement, 0, 0);

					const baseName = options.filename
						? `${sanitizeFilename(getBaseFilename(options.filename))}-ascii`
						: 'ascii-art';

					scaledCanvas.toBlob(
						(blob) => {
							if (!blob) return;
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = `${baseName}.webp`;
							a.click();
							URL.revokeObjectURL(url);
						},
						'image/webp',
						0.95
					);

					return; // Success, exit early
				}
			}
		} catch (error) {
			console.warn('Canvas renderer failed, falling back to SVG method:', error);
		}
	}

	// If canvas renderer fails, fallback to SVG method
	const svgData = buildSvgContent({
		asciiOutput,
		theme,
		outputElementId: options.outputElementId,
		transparentBackground: options.transparentBackground,
		backgroundColor: options.backgroundColor
	});
	if (!svgData) return;

	const img = new Image();
	const svgBlob = new Blob([svgData.svg], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(svgBlob);

	img.onload = () => {
		const canvas = document.createElement('canvas');
		const deviceScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		const scale = options.scale ?? Math.max(2, deviceScale);
		canvas.width = Math.ceil(svgData.width * scale);
		canvas.height = Math.ceil(svgData.height * scale);

		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) {
			URL.revokeObjectURL(url);
			return;
		}

		ctx.setTransform(scale, 0, 0, scale, 0, 0);
		ctx.clearRect(0, 0, svgData.width, svgData.height);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, 0, 0, svgData.width, svgData.height);

		const baseName = options.filename
			? `${sanitizeFilename(getBaseFilename(options.filename))}-ascii`
			: 'ascii-art';
		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const downloadUrl = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = downloadUrl;
				a.download = `${baseName}.webp`;
				a.click();
				URL.revokeObjectURL(downloadUrl);
			},
			'image/webp',
			0.95
		);

		URL.revokeObjectURL(url);
	};

	img.onerror = () => {
		URL.revokeObjectURL(url);
	};

	img.src = url;
}

export async function downloadGif(
	frames: ConvertedAsciiFrame[],
	theme: string,
	options: DownloadGifOptions = {}
): Promise<void> {
	if (!frames.length) return;
	if (typeof document === 'undefined') return;

	const effectiveFrames = frames.filter((frame) => Boolean(frame?.ascii));
	if (!effectiveFrames.length) return;

	const baseName = options.filename
		? `${sanitizeFilename(getBaseFilename(options.filename))}-ascii`
		: 'ascii-animation';
	const scale = Math.max(0.5, options.scale ?? 1);
	// const repeat = Number.isFinite(options.repeat ?? 0)
	// 	? Math.max(-1, Math.floor(options.repeat ?? 0))
	// 	: 0;
	// const colorBudget = Math.min(Math.max(options.colors ?? 128, 2), 256);
	const useTransparentBackground = Boolean(options.transparentBackground);

	// Rasterize all frames to RGBA
	console.log(`[Main] Starting rasterization of ${effectiveFrames.length} frames...`);

	// init the progress
	options.onProgress?.(0);

	const rasterStartTime = performance.now();
	const rgbaFrames: ArrayBuffer[] = [];
	const delays: number[] = [];

	let width = 0;
	let height = 0;

	// Use canvas renderer for much faster rasterization
	const fontSize = 10;
	const fontFamily = "'Inconsolata', monospace";

	let reusableCanvas: OffscreenCanvas | HTMLCanvasElement;
	if (typeof OffscreenCanvas !== 'undefined') {
		reusableCanvas = new OffscreenCanvas(100, 100);
	} else {
		reusableCanvas = document.createElement('canvas');
	}

	for (let i = 0; i < effectiveFrames.length; i++) {
		const frame = effectiveFrames[i];

		// Render directly to canvas/ImageData
		const rendered = renderToImageData(frame.ascii, {
			fontSize,
			fontFamily,
			backgroundColor: options.backgroundColor,
			transparentBackground: useTransparentBackground,
			reuseCanvas: reusableCanvas
		});

		if (!rendered) continue;

		if (!width || !height) {
			width = rendered.width;
			height = rendered.height;
		}

		let finalImageData = rendered;
		if (scale !== 1) {
			// Simple scaling via temporary canvas
			const scaledWidth = Math.ceil(width * scale);
			const scaledHeight = Math.ceil(height * scale);
			const scaledCanvas =
				typeof OffscreenCanvas !== 'undefined'
					? new OffscreenCanvas(scaledWidth, scaledHeight)
					: document.createElement('canvas');

			scaledCanvas.width = scaledWidth;
			scaledCanvas.height = scaledHeight;

			const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true }) as
				| CanvasRenderingContext2D
				| OffscreenCanvasRenderingContext2D;
			if (ctx) {
				ctx.imageSmoothingEnabled = false;

				// Draw original data to temp canvas
				const tempCanvas =
					typeof OffscreenCanvas !== 'undefined'
						? new OffscreenCanvas(width, height)
						: document.createElement('canvas');
				tempCanvas.width = width;
				tempCanvas.height = height;
				const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true }) as
					| CanvasRenderingContext2D
					| OffscreenCanvasRenderingContext2D;
				tempCtx.putImageData(rendered, 0, 0);

				// Draw scaled
				ctx.scale(scale, scale);
				ctx.drawImage(tempCanvas as HTMLCanvasElement, 0, 0);

				finalImageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);

				// Update width/height to scaled values
				if (width !== scaledWidth) {
					width = scaledWidth;
					height = scaledHeight;
				}
			}
		}

		const frameDelay = Math.max(20, frame.delay || 0);
		delays.push(frameDelay);
		rgbaFrames.push(finalImageData.data.buffer.slice(0));

		// Report rasterization progress (0-50%)
		if (i % 3 === 0 || i === effectiveFrames.length - 1) {
			const rasterProgress = ((i + 1) / effectiveFrames.length) * 50;
			options.onProgress?.(rasterProgress);
		}
		if (rgbaFrames.length % 5 === 0) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
	}

	const rasterDuration = performance.now() - rasterStartTime;
	console.log(`[Main] Rasterization complete in ${rasterDuration.toFixed(2)}ms`);

	if (!rgbaFrames.length || !width || !height) return;

	// Use worker for encoding
	try {
		const workerManager = getWorkerManager();
		const loopCount = options.repeat === undefined ? -1 : options.repeat;
		options.onProgress?.(50);
		const estimatedEncodingMs = effectiveFrames.length * 100 + (width * height) / 100;
		const progressInterval = Math.max(100, estimatedEncodingMs / 45);

		let currentProgress = 50;
		const progressTimer = setInterval(() => {
			if (currentProgress < 95) {
				currentProgress = Math.min(95, currentProgress + 1);
				options.onProgress?.(currentProgress);
			}
		}, progressInterval);

		try {
			const blob = await workerManager.exportGif(
				{
					frames: rgbaFrames,
					delays,
					width,
					height,
					repeat: loopCount,
					quality: 70, // !TODO: Add quality slider, atm this is the most balanced value
					transparent: useTransparentBackground
				},
				{
					onProgress: (progress) => {
						// Only clear timer and report when encoding is actually complete
						if (progress >= 95) {
							clearInterval(progressTimer);
							options.onProgress?.(progress);
						}
					},
					onError: options.onError,
					signal: options.signal
				}
			);

			clearInterval(progressTimer);
			options.onProgress?.(100);

			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${baseName}.gif`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			clearInterval(progressTimer);
			throw error;
		}
	} catch (error) {
		console.error('Failed to export GIF via worker:', error);
		throw error; // Re-throw to propagate to UI
	}
}

export async function downloadApng(
	frames: ConvertedAsciiFrame[],
	theme: string,
	options: DownloadApngOptions = {}
): Promise<void> {
	if (!frames.length) return;
	if (typeof document === 'undefined') return;

	const effectiveFrames = frames.filter((frame) => Boolean(frame?.ascii));
	if (!effectiveFrames.length) return;

	const baseName = options.filename
		? `${sanitizeFilename(getBaseFilename(options.filename))}-ascii`
		: 'ascii-animation';
	const scale = Math.max(0.5, options.scale ?? 1);
	// const rawColors = options.colors;
	// const colorCount = rawColors === undefined ? 0 : Math.min(Math.max(Math.floor(rawColors), 0), 256);
	const useTransparentBackground = Boolean(options.transparentBackground);

	const canvas = document.createElement('canvas');
	const rgbaFrames: ArrayBuffer[] = [];
	const delays: number[] = [];
	let width = 0;
	let height = 0;

	for (const frame of effectiveFrames) {
		const svgData = buildSvgContent({
			asciiOutput: frame.ascii,
			theme,
			outputElementId: options.outputElementId,
			transparentBackground: useTransparentBackground,
			backgroundColor: options.backgroundColor
		});
		if (!svgData) continue;

		try {
			const raster = await rasterizeSvg(svgData.svg, svgData.width, svgData.height, canvas, scale);
			if (!width || !height) {
				width = raster.width;
				height = raster.height;
			}

			const frameDelay = Math.max(16, Math.round(frame.delay || 0));
			delays.push(frameDelay);
			rgbaFrames.push(raster.imageData.data.buffer.slice(0));
		} catch (error) {
			console.warn('Unable to encode APNG frame', error);
		}
	}

	if (!rgbaFrames.length || !width || !height) return;

	// Use worker for encoding
	try {
		const workerManager = getWorkerManager();
		const blob = await workerManager.exportApng(
			{
				frames: rgbaFrames,
				delays,
				width,
				height,
				repeat: 0, // Infinite loop by default
				quality: options.colors ?? 128 // Use colors option as quality, default 128 for good balance
			},
			{
				onProgress: (progress) => {
					options.onProgress?.(progress);
				},
				onError: options.onError,
				signal: options.signal
			}
		);

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${baseName}.png`;
		a.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Failed to export APNG via worker:', error);
		throw error; // Re-throw to propagate to UI
	}
}

async function rasterizeSvg(
	svgMarkup: string,
	logicalWidth: number,
	logicalHeight: number,
	canvas: HTMLCanvasElement,
	scale: number
): Promise<{ imageData: ImageData; width: number; height: number }> {
	const targetWidth = Math.max(1, Math.ceil(logicalWidth * scale));
	const targetHeight = Math.max(1, Math.ceil(logicalHeight * scale));

	return await new Promise((resolve, reject) => {
		const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const img = new Image();

		img.onload = () => {
			try {
				canvas.width = targetWidth;
				canvas.height = targetHeight;
				const ctx = canvas.getContext('2d', { willReadFrequently: true });
				if (!ctx) {
					reject(new Error('Failed to acquire 2D context for GIF export'));
					return;
				}
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, targetWidth, targetHeight);
				ctx.imageSmoothingEnabled = false;
				ctx.setTransform(scale, 0, 0, scale, 0, 0);
				ctx.drawImage(img, 0, 0);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
				resolve({
					imageData,
					width: targetWidth,
					height: targetHeight
				});
			} catch (error) {
				reject(error);
			} finally {
				URL.revokeObjectURL(url);
			}
		};

		img.onerror = (event) => {
			URL.revokeObjectURL(url);
			reject(
				event instanceof ErrorEvent
					? (event.error ?? new Error('Failed to load SVG frame'))
					: new Error('Failed to load SVG frame')
			);
		};

		img.src = url;
	});
}

function getCommonDelay(frames: ConvertedAsciiFrame[]): number | null {
	if (frames.length === 0) return null;
	const firstDelay = frames[0].delay;
	const allSame = frames.every((f) => f.delay === firstDelay);
	return allSame ? firstDelay : null;
}

/**
 * Export animated ASCII art as a JSON file that can be played back on other websites/terminal
 * I kinda copied lootie...
 */
/**
 * Export animated ASCII art as a JSON file that can be played back on other websites/terminal
 * Optimized with global palette and .askey extension
 */
export async function downloadAnimationJson(
	frames: ConvertedAsciiFrame[],
	filename = 'ascii-animation.askey'
): Promise<void> {
	if (!frames || frames.length === 0) return;

	const totalDuration = frames.reduce((sum, frame) => sum + frame.delay, 0);
	const commonDelay = getCommonDelay(frames);

	// Ensure extension is .askey
	let finalFilename = filename;
	if (!finalFilename.endsWith('.askey')) {
		finalFilename = getBaseFilename(finalFilename) + '.askey';
	}
	const sanitizedBase = sanitizeFilename(getBaseFilename(finalFilename));

	// 1. Pre-process: Collect all colors and normalize content
	const colorCounts = new Map<string, number>();
	const rgbRegex = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/g;
	const colorRegex = /#[0-9a-f]{6}/gi;

	const processedFrames = frames.map((frame) => {
		let content = frame.ascii;
		// Normalize RGB to Hex
		content = content.replace(rgbRegex, (match, r, g, b) => {
			const toHex = (n: string) => parseInt(n).toString(16).padStart(2, '0');
			return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
		});

		// Count colors
		const matches = content.match(colorRegex) || [];
		matches.forEach((c) => {
			const color = c.toLowerCase();
			colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
		});

		return { ...frame, ascii: content };
	});

	// 2. Build Global Palette
	// Sort by frequency to give single-char keys to most common colors
	const sortedColors = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
	const colorPalette: Record<string, string> = {};
	const colorMap = new Map<string, string>();
	const colorLetters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

	sortedColors.forEach((color, index) => {
		if (index < colorLetters.length) {
			const key = colorLetters[index];
			colorPalette[key] = color;
			colorMap.set(color, key);
		}
	});

	// 3. Optimize Frames using Global Palette
	const optimizedFrames = processedFrames.map((frame) => {
		let content = frame.ascii;
		content = content.replace(
			/<span style="color: (#[0-9a-f]{6})">(.?)<\/span>/gi,
			(match, color, char) => {
				const lowerColor = color.toLowerCase();
				const key = colorMap.get(lowerColor);
				// Use short key if available, otherwise full color
				return `<s c="${key || color}">${char}</s>`;
			}
		);
		return {
			c: content,
			d: frame.delay
		};
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const animationData: Record<string, any> = {
		v: '2.0.0', // Bump version for new format
		n: sanitizedBase,
		m: {
			f: frames.length,
			d: totalDuration,
			t: new Date().toISOString()
		},
		p: colorPalette, // Global palette
		fr: optimizedFrames
	};

	// Optimization: If all delays are the same, we could theoretically store it in root,
	// but our new format expects {c, d} in frames.
	// To save space, if commonDelay exists, we could omit 'd' in frames and put it in 'm' or root,
	// but let's stick to a consistent frame structure for now or use the previous logic if preferred.
	// The previous logic had separate branches. Let's support the 'common delay' optimization.
	if (commonDelay !== null) {
		animationData.d = commonDelay;
		animationData.fr = optimizedFrames.map((f) => f.c); // Just strings if delay is common
	}

	const jsonString = JSON.stringify(animationData);

	// gzip compression *if supported
	let blob: Blob;
	const downloadFilename = finalFilename;

	if (typeof CompressionStream !== 'undefined') {
		try {
			// Compress using native browser API
			const stream = new Blob([jsonString]).stream();
			const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
			const compressedBlob = await new Response(compressedStream).blob();

			blob = compressedBlob;
			// Usually .json.gz, but user wants .askey.
			// We can keep .askey and just know it's gzipped JSON.
			// Or maybe .askey.gz? The request said "make them be .askey files".
			// I'll assume .askey implies the compressed format.
		} catch (error) {
			console.warn('Compression failed, using uncompressed', error);
			blob = new Blob([jsonString], { type: 'application/json' });
		}
	} else {
		// Fallback: no compression
		blob = new Blob([jsonString], { type: 'application/json' });
	}

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = downloadFilename;
	a.click();
	URL.revokeObjectURL(url);
}
