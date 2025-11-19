import * as gifenc from 'gifenc';
import type { GIFFrameOptions } from 'gifenc';
import UPNG from 'upng-js';
const { GIFEncoder, applyPalette, quantize } = gifenc;
import { buildSvgContent } from './render';
import type { ConvertedAsciiFrame } from './converter';

interface ExportOptions {
	outputElementId?: string;
	transparentBackground?: boolean;
	backgroundColor?: string;
	filename?: string;
}

interface DownloadPngOptions extends ExportOptions {
	scale?: number;
}

type DownloadWebpOptions = DownloadPngOptions;

interface DownloadGifOptions extends ExportOptions {
	scale?: number;
	repeat?: number;
	colors?: number;
}

interface DownloadApngOptions extends ExportOptions {
	scale?: number;
	colors?: number;
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

export async function copyAsciiToClipboard(elementId = 'ascii-output'): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.clipboard) return;
	const element = document.getElementById(elementId);
	if (!element) return;
	const text = element.textContent ?? '';
	await navigator.clipboard.writeText(text);
}

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

		const ctx = canvas.getContext('2d');
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

		const ctx = canvas.getContext('2d');
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
	const repeat = Number.isFinite(options.repeat ?? 0)
		? Math.max(-1, Math.floor(options.repeat ?? 0))
		: 0;
	const colorBudget = Math.min(Math.max(options.colors ?? 128, 2), 256);
	const useTransparentBackground = Boolean(options.transparentBackground);

	// First create APNG with high quality
	const canvas = document.createElement('canvas');
	const rgbaFrames: ArrayBuffer[] = [];
	const delays: number[] = [];
	const rasterPromises: Promise<{
		imageData: ImageData;
		width: number;
		height: number;
		hasTransparency: boolean;
	} | null>[] = [];

	let width = 0;
	let height = 0;

	// Rasterize all frames to RGBA
	for (const frame of effectiveFrames) {
		const svgData = buildSvgContent({
			asciiOutput: frame.ascii,
			theme,
			outputElementId: options.outputElementId,
			transparentBackground: useTransparentBackground,
			backgroundColor: options.backgroundColor
		});

		if (!svgData) {
			rasterPromises.push(Promise.resolve(null));
			continue;
		}

		const rasterPromise = rasterizeSvg(
			svgData.svg,
			svgData.width,
			svgData.height,
			canvas,
			scale
		).catch((error) => {
			console.warn('Unable to rasterize frame for GIF export', error);
			return null;
		});

		rasterPromises.push(rasterPromise);
	}

	const rasterResults = await Promise.all(rasterPromises);

	// Build RGBA frames array
	for (let i = 0; i < rasterResults.length; i++) {
		const raster = rasterResults[i];
		if (!raster) continue;

		if (!width || !height) {
			width = raster.width;
			height = raster.height;
		}

		const frameDelay = Math.max(20, effectiveFrames[i].delay || 0);
		delays.push(frameDelay);
		rgbaFrames.push(raster.imageData.data.buffer.slice(0));
	}

	if (!rgbaFrames.length || !width || !height) return;

	// Now convert RGBA frames to GIF with palette quantization
	const encoder = GIFEncoder();
	let wroteFrame = false;

	for (let i = 0; i < rgbaFrames.length; i++) {
		const rgbaBuffer = new Uint8ClampedArray(rgbaFrames[i]);
		const frameDelay = delays[i];

		const palette = quantize(rgbaBuffer, colorBudget, {
			format: 'rgba4444',
			clearAlpha: true,
			clearAlphaThreshold: 0
		});

		let transparentIndex = -1;
		const frameHasAlpha = useTransparentBackground && hasTransparentPixels(rgbaBuffer);

		if (frameHasAlpha) {
			transparentIndex = palette.findIndex((color) => color.length >= 4 && color[3] === 0);
			if (transparentIndex === -1) {
				if (palette.length >= 256) {
					palette[palette.length - 1] = [0, 0, 0, 0];
					transparentIndex = palette.length - 1;
				} else {
					palette.push([0, 0, 0, 0]);
					transparentIndex = palette.length - 1;
				}
			}
		}

		const indexedPixels = applyPalette(rgbaBuffer, palette, 'rgba4444');
		const frameOptions: GIFFrameOptions = {
			palette,
			delay: frameDelay,
			dispose: 2
		};

		if (!wroteFrame) {
			frameOptions.repeat = repeat;
		}

		if (frameHasAlpha && transparentIndex >= 0) {
			frameOptions.transparent = true;
			frameOptions.transparentIndex = transparentIndex;
		}

		encoder.writeFrame(indexedPixels, width, height, frameOptions);
		wroteFrame = true;
	}

	if (!wroteFrame) return;

	encoder.finish();
	const bytes = encoder.bytes();
	const safeBytes = new Uint8Array(bytes);
	const blob = new Blob([safeBytes], { type: 'image/gif' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${baseName}.gif`;
	a.click();
	URL.revokeObjectURL(url);
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
	const rawColors = options.colors;
	const colorCount =
		rawColors === undefined ? 0 : Math.min(Math.max(Math.floor(rawColors), 0), 256);
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

	const encoded = UPNG.encode(
		rgbaFrames,
		width,
		height,
		colorCount,
		rgbaFrames.length > 1 ? delays : undefined
	);
	const apngBytes = new Uint8Array(encoded);
	const blob = new Blob([apngBytes], { type: 'image/apng' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${baseName}.png`;
	a.click();
	URL.revokeObjectURL(url);
}

async function rasterizeSvg(
	svgMarkup: string,
	logicalWidth: number,
	logicalHeight: number,
	canvas: HTMLCanvasElement,
	scale: number
): Promise<{ imageData: ImageData; width: number; height: number; hasTransparency: boolean }> {
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
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to acquire 2D context for GIF export'));
					return;
				}
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, targetWidth, targetHeight);
				ctx.imageSmoothingEnabled = false;
				ctx.setTransform(scale, 0, 0, scale, 0, 0);
				ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
				resolve({
					imageData,
					width: targetWidth,
					height: targetHeight,
					hasTransparency: hasTransparentPixels(imageData.data)
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

function hasTransparentPixels(data: Uint8ClampedArray): boolean {
	for (let index = 3; index < data.length; index += 4) {
		if (data[index] < 255) {
			return true;
		}
	}
	return false;
}

/**
 * pseudo-compress ASCII content by shortening color codes and using a palette
 */
function optimizeAsciiContent(ascii: string): string {
	let optimized = ascii;

	optimized = optimized.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, (match, r, g, b) => {
		const toHex = (n: string) => parseInt(n).toString(16).padStart(2, '0');
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	});

	const colorMap = new Map<string, string>();
	const colorLetters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let colorIndex = 0;

	const colorRegex = /#[0-9a-f]{6}/gi;
	const colors = optimized.match(colorRegex) || [];
	const uniqueColors = [...new Set(colors.map((c) => c.toLowerCase()))];

	uniqueColors.forEach((color) => {
		if (colorIndex < colorLetters.length) {
			colorMap.set(color, colorLetters[colorIndex++]);
		}
	});

	optimized = optimized.replace(
		/<span style="color: (#[0-9a-f]{6})">(.?)<\/span>/gi,
		(match, color, char) => {
			const shortColor = colorMap.get(color.toLowerCase()) || color;
			return `<s c="${shortColor}">${char}</s>`;
		}
	);

	// save palette at the start of the content
	if (colorMap.size > 0) {
		const palette = Array.from(colorMap.entries())
			.map(([color, letter]) => `${letter}:${color}`)
			.join(',');
		optimized = `<!--P:${palette}-->${optimized}`;
	}

	return optimized;
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
export async function downloadAnimationJson(
	frames: ConvertedAsciiFrame[],
	filename = 'ascii-animation.json'
): Promise<void> {
	if (!frames || frames.length === 0) return;

	const totalDuration = frames.reduce((sum, frame) => sum + frame.delay, 0);
	const commonDelay = getCommonDelay(frames);

	const sanitizedBase = sanitizeFilename(getBaseFilename(filename));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const animationData: Record<string, any> = {
		v: '1.0.0',
		n: sanitizedBase,
		m: {
			f: frames.length,
			d: totalDuration,
			t: new Date().toISOString()
		}
	};

	// If all delays are the same, store once instead of per-frame
	if (commonDelay !== null) {
		animationData.d = commonDelay;
		animationData.fr = frames.map((frame) => optimizeAsciiContent(frame.ascii));
	} else {
		animationData.fr = frames.map((frame) => ({
			c: optimizeAsciiContent(frame.ascii),
			d: frame.delay
		}));
	}

	const jsonString = JSON.stringify(animationData);

	// gzip compression *if supported
	let blob: Blob;
	let downloadFilename = `${sanitizedBase}.json`;

	if (typeof CompressionStream !== 'undefined') {
		try {
			// Compress using native browser API
			const stream = new Blob([jsonString]).stream();
			const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
			const compressedBlob = await new Response(compressedStream).blob();

			blob = compressedBlob;
			downloadFilename = `${sanitizedBase}.json.gz`;
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
