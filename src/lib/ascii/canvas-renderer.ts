/**
 * Canvas-based ASCII renderer
 * Alternative to DOM rendering for better performance in exports
 */

export interface CanvasRenderOptions {
	fontSize?: number;
	fontFamily?: string;
	backgroundColor?: string;
	transparentBackground?: boolean;
	reuseCanvas?: HTMLCanvasElement | OffscreenCanvas;
}

export interface RenderedCanvas {
	canvas: HTMLCanvasElement | OffscreenCanvas;
	width: number;
	height: number;
	charWidth?: number;
	lineHeight?: number;
	totalLines?: number;
	maxLineLength?: number;
}

interface ParsedLine {
	text: string;
	chars: Array<{ char: string; color: string }>;
}

interface ParsedAscii {
	lines: ParsedLine[];
	timestamp: number;
}

// LRU Cache for parsed ASCII
const parsedCache = new Map<string, ParsedAscii>();
const MAX_CACHE_ENTRIES = 50;

function getCacheKey(asciiOutput: string): string {
	// Use the full string as key to avoid hash collisions
	// Performance impact is negligible compared to rendering cost
	return asciiOutput;
}

function parseAsciiOutput(asciiOutput: string): { lines: ParsedLine[] } {
	const cacheKey = getCacheKey(asciiOutput);

	// Check cache
	const cached = parsedCache.get(cacheKey);
	if (cached) {
		// Move to end (LRU)
		parsedCache.delete(cacheKey);
		cached.timestamp = Date.now();
		parsedCache.set(cacheKey, cached);
		return { lines: cached.lines };
	}

	// Parse ASCII
	const rawLines = asciiOutput.split('\n');
	const lines: ParsedLine[] = [];

	for (const rawLine of rawLines) {
		const chars: Array<{ char: string; color: string }> = [];
		let text = '';
		// Regex to match the span format produced by ascii-worker
		// <span style="color: rgb(r, g, b)">c</span>
		const spanRegex = /<span style="color: ([^"]+)">(.?)<\/span>/g;
		let match;

		while ((match = spanRegex.exec(rawLine)) !== null) {
			const color = match[1];
			const char = match[2];
			chars.push({ char, color });
			text += char;
		}

		if (chars.length > 0) {
			lines.push({ text, chars });
		}
	}

	// Add to cache with LRU eviction
	if (parsedCache.size >= MAX_CACHE_ENTRIES) {
		// Remove oldest entry (first in Map)
		const firstKey = parsedCache.keys().next().value;
		if (firstKey !== undefined) {
			parsedCache.delete(firstKey);
		}
	}

	parsedCache.set(cacheKey, { lines, timestamp: Date.now() });
	return { lines };
}

/**
 * Clear the parsed ASCII cache (useful for memory management)
 */
export function clearParseCache(): void {
	parsedCache.clear();
}

export function renderToCanvas(
	asciiOutput: string,
	options: CanvasRenderOptions = {}
): RenderedCanvas | null {
	if (!asciiOutput) return null;

	const fontSize = options.fontSize ?? 10;
	const fontFamily = options.fontFamily ?? "'Inconsolata', monospace";
	const backgroundColor = options.backgroundColor ?? '#000000';
	const transparentBackground = options.transparentBackground ?? false;

	let canvas: HTMLCanvasElement | OffscreenCanvas;
	let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

	if (options.reuseCanvas) {
		canvas = options.reuseCanvas;
		ctx = canvas.getContext('2d', { willReadFrequently: true }) as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
	} else if (typeof OffscreenCanvas !== 'undefined') {
		canvas = new OffscreenCanvas(100, 100);
		ctx = canvas.getContext('2d', { willReadFrequently: true });
	} else {
		canvas = document.createElement('canvas');
		ctx = canvas.getContext('2d', { willReadFrequently: true });
	}

	if (!ctx) return null;

	ctx.font = `${fontSize}px ${fontFamily}`;
	ctx.textBaseline = 'top';
	const parsed = parseAsciiOutput(asciiOutput);
	const lines = parsed.lines;
	const maxLineLength = Math.max(...lines.map((line) => line.text.length), 1);
	const metrics = ctx.measureText('M');
	const charWidth = metrics.width;
	const lineHeight = fontSize;
	const canvasWidth = Math.ceil(maxLineLength * charWidth);
	const canvasHeight = Math.ceil(lines.length * lineHeight);

	// Resize canvas to fit content
	// This usually clears the canvas, but we'll be explicit below
	if (canvas instanceof HTMLCanvasElement) {
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
	} else if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
	}

	// Re-apply font after resize (canvas reset)
	ctx.font = `${fontSize}px ${fontFamily}`;
	ctx.textBaseline = 'top';

	// Explicitly clear canvas to ensure no artifacts from previous frames
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);

	// Fill background
	if (!transparentBackground) {
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);
	}

	// Set up canvas
	ctx.imageSmoothingEnabled = false;

	// Batch characters by color to reduce context state changes
	// This is much faster than changing fillStyle for every character
	const colorBatches = new Map<string, Array<{ char: string; x: number; y: number }>>();

	for (let y = 0; y < lines.length; y++) {
		const line = lines[y];
		for (let x = 0; x < line.chars.length; x++) {
			const { char, color } = line.chars[x];
			if (char === ' ') continue; // Skip spaces for performance

			// Group characters by color
			let batch = colorBatches.get(color);
			if (!batch) {
				batch = [];
				colorBatches.set(color, batch);
			}
			batch.push({ char, x: x * charWidth, y: y * lineHeight });
		}
	}

	// Render all characters of the same color in one batch
	for (const [color, chars] of colorBatches) {
		ctx.fillStyle = color;
		for (const { char, x, y } of chars) {
			ctx.fillText(char, x, y);
		}
	}

	return {
		canvas,
		width: canvasWidth,
		height: canvasHeight,
		charWidth,
		lineHeight,
		totalLines: lines.length,
		maxLineLength
	};
}

/**
 * Render ASCII art to ImageData
 * Useful for further processing or export
 */
export function renderToImageData(
	asciiOutput: string,
	options: CanvasRenderOptions = {}
): ImageData | null {
	const rendered = renderToCanvas(asciiOutput, options);
	if (!rendered) return null;

	const { canvas, width, height } = rendered;

	// Get context to extract ImageData
	let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

	if (canvas instanceof OffscreenCanvas) {
		ctx = canvas.getContext('2d', { willReadFrequently: true });
	} else {
		ctx = canvas.getContext('2d', { willReadFrequently: true });
	}

	if (!ctx) return null;

	return ctx.getImageData(0, 0, width, height);
}

/**
 * Convert canvas to blob for download
 */
export async function canvasToBlob(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	type: string = 'image/png',
	quality?: number
): Promise<Blob | null> {
	if (canvas instanceof OffscreenCanvas) {
		return await canvas.convertToBlob({ type, quality });
	} else {
		return new Promise((resolve) => {
			canvas.toBlob((blob) => resolve(blob), type, quality);
		});
	}
}
