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
	customTintColor?: string;
	mousePos?: { x: number; y: number };
	mouseRadius?: number;
	mousePushStrength?: number;
}

export interface RenderedCanvas {
	canvas: HTMLCanvasElement | OffscreenCanvas;
	width: number;
	height: number;
	charWidth?: number;
	lineHeight?: number;
	totalLines?: number;
	maxLineLength?: number;
	physicsActive?: boolean;
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
const MAX_CACHE_ENTRIES = 600;

// Cache for character width measurements to avoid layout recalculations
const charWidthCache = new Map<string, number>();

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
		let i = 0;
		while (i < rawLine.length) {
			if (rawLine.startsWith('<span style="color: ', i)) {
				const colorStart = i + '<span style="color: '.length;
				const colorEnd = rawLine.indexOf('">', colorStart);
				if (colorEnd !== -1) {
					const color = rawLine.substring(colorStart, colorEnd);
					const textStart = colorEnd + 2;
					const textEnd = rawLine.indexOf('</span>', textStart);
					if (textEnd !== -1) {
						const runText = rawLine.substring(textStart, textEnd);
						for (let j = 0; j < runText.length; j++) {
							chars.push({ char: runText[j], color });
							text += runText[j];
						}
						i = textEnd + '</span>'.length;
						continue;
					}
				}
			}
			// Raw character
			chars.push({ char: rawLine[i], color: '#ffffff' });
			text += rawLine[i];
			i++;
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
	charWidthCache.clear();
}

interface RGB {
	r: number;
	g: number;
	b: number;
}

function parseColor(colorStr: string): RGB {
	if (colorStr.startsWith('#')) {
		if (colorStr.length === 4) {
			const r = parseInt(colorStr[1] + colorStr[1], 16);
			const g = parseInt(colorStr[2] + colorStr[2], 16);
			const b = parseInt(colorStr[3] + colorStr[3], 16);
			return { r, g, b };
		} else if (colorStr.length === 7) {
			const r = parseInt(colorStr.substring(1, 3), 16);
			const g = parseInt(colorStr.substring(3, 5), 16);
			const b = parseInt(colorStr.substring(5, 7), 16);
			return { r, g, b };
		}
	}
	const match = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
	if (match) {
		return {
			r: parseInt(match[1], 10),
			g: parseInt(match[2], 10),
			b: parseInt(match[3], 10)
		};
	}
	return { r: 255, g: 255, b: 255 };
}

function blendColors(color1Str: string, color2Str: string, ratio: number): string {
	const c1 = parseColor(color1Str);
	const c2 = parseColor(color2Str);
	const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
	const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
	const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
	return `rgb(${r},${g},${b})`;
}

interface PhysicsParticle {
	originalChar: string;
	char: string;
	originalColor: string;
	color: string;
	restX: number;
	restY: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
}

class CanvasParticleSystem {
	particles: PhysicsParticle[] = [];
	cols = 0;
	rows = 0;
	lastMouseX: number | null = null;
	lastMouseY: number | null = null;
	lastTime = 0;

	constructor(
		lines: ParsedLine[],
		cols: number,
		rows: number,
		charWidth: number,
		lineHeight: number
	) {
		this.cols = cols;
		this.rows = rows;
		this.init(lines, charWidth, lineHeight);
		this.lastTime = performance.now();
	}

	init(lines: ParsedLine[], charWidth: number, lineHeight: number) {
		for (let y = 0; y < this.rows; y++) {
			const line = lines[y];
			for (let x = 0; x < this.cols; x++) {
				const charObj = line && line.chars[x] ? line.chars[x] : { char: ' ', color: '#ffffff' };
				const restX = x * charWidth;
				const restY = y * lineHeight;

				this.particles.push({
					originalChar: charObj.char,
					char: charObj.char,
					originalColor: charObj.color,
					color: charObj.color,
					restX,
					restY,
					x: restX,
					y: restY,
					vx: 0,
					vy: 0
				});
			}
		}
	}

	updateFrame(
		lines: ParsedLine[],
		cols: number,
		rows: number,
		charWidth: number,
		lineHeight: number
	) {
		if (this.cols !== cols || this.rows !== rows) {
			this.cols = cols;
			this.rows = rows;
			this.particles = [];
			this.init(lines, charWidth, lineHeight);
			return;
		}

		let index = 0;
		for (let y = 0; y < rows; y++) {
			const line = lines[y];
			for (let x = 0; x < cols; x++) {
				const charObj = line && line.chars[x] ? line.chars[x] : { char: ' ', color: '#ffffff' };
				const p = this.particles[index++];

				if ((p.originalChar === ' ') !== (charObj.char === ' ')) {
					p.x = p.restX;
					p.y = p.restY;
					p.vx = 0;
					p.vy = 0;
				}

				p.originalChar = charObj.char;
				p.originalColor = charObj.color;

				if (p.x === p.restX && p.y === p.restY) {
					p.color = charObj.color;
				}

				if (p.char === p.originalChar || p.originalChar === ' ') {
					p.char = charObj.char;
				}
			}
		}
	}

	getOriginalColorAt(x: number, y: number, charWidth: number, lineHeight: number): string | null {
		const col = Math.round(x / charWidth);
		const row = Math.round(y / lineHeight);
		if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
			const idx = row * this.cols + col;
			return this.particles[idx]?.originalColor || null;
		}
		return null;
	}

	update(
		mouseX: number | null,
		mouseY: number | null,
		fontSize: number,
		charWidth: number,
		lineHeight: number
	): boolean {
		const now = performance.now();
		let dt = (now - this.lastTime) / 1000;
		this.lastTime = now;

		if (dt > 0.1) dt = 0.1;
		if (dt <= 0) return true;

		let mvx = 0;
		let mvy = 0;
		if (
			mouseX !== null &&
			mouseY !== null &&
			this.lastMouseX !== null &&
			this.lastMouseY !== null
		) {
			mvx = (mouseX - this.lastMouseX) / dt;
			mvy = (mouseY - this.lastMouseY) / dt;
		}
		this.lastMouseX = mouseX;
		this.lastMouseY = mouseY;

		const k = 160.0;
		const damping = 10.0;
		const radius = 6 * fontSize;

		const maxVelocityKick = 1200;
		const cappedMvx = Math.max(-maxVelocityKick, Math.min(maxVelocityKick, mvx));
		const cappedMvy = Math.max(-maxVelocityKick, Math.min(maxVelocityKick, mvy));

		let anyActive = false;

		for (const p of this.particles) {
			if (p.originalChar === ' ') {
				p.x = p.restX;
				p.y = p.restY;
				p.vx = 0;
				p.vy = 0;
				continue;
			}

			const dxHome = p.restX - p.x;
			const dyHome = p.restY - p.y;
			const axSpring = k * dxHome - damping * p.vx;
			const aySpring = k * dyHome - damping * p.vy;

			let axMouse = 0;
			let ayMouse = 0;

			if (mouseX !== null && mouseY !== null) {
				const dxMouse = p.x - mouseX;
				const dyMouse = p.y - mouseY;
				const distSq = dxMouse * dxMouse + dyMouse * dyMouse;
				const dist = Math.sqrt(distSq);

				if (dist < radius && dist > 0.1) {
					const factor = 1.0 - dist / radius;

					const blastForce = 250.0 * fontSize * factor;
					const blastX = (dxMouse / dist) * blastForce;
					const blastY = (dyMouse / dist) * blastForce;

					const dragStrength = 18.0 * factor;
					const dragX = cappedMvx * dragStrength;
					const dragY = cappedMvy * dragStrength;

					axMouse = blastX + dragX;
					ayMouse = blastY + dragY;

					const glitchSet = '0123456789$#@%&?+=*~!@#X%';
					const idx = Math.floor(Math.random() * glitchSet.length);
					p.char = glitchSet[idx];
				} else {
					p.char = p.originalChar;
				}
			} else {
				p.char = p.originalChar;
			}

			const cRGB = parseColor(p.originalColor);
			const luminance = 0.2126 * cRGB.r + 0.7152 * cRGB.g + 0.0722 * cRGB.b;
			const mass = 0.5 + 1.5 * (1.0 - luminance / 255.0);

			p.vx += ((axSpring + axMouse) / mass) * dt;
			p.vy += ((aySpring + ayMouse) / mass) * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;

			const currentTargetColor =
				this.getOriginalColorAt(p.x, p.y, charWidth, lineHeight) || p.originalColor;
			p.color = blendColors(p.color, currentTargetColor, 0.2);

			if (
				Math.abs(p.vx) > 0.2 ||
				Math.abs(p.vy) > 0.2 ||
				Math.abs(p.x - p.restX) > 0.2 ||
				Math.abs(p.y - p.restY) > 0.2
			) {
				anyActive = true;
			}
		}

		return anyActive;
	}
}

const particleSystems = new WeakMap<HTMLCanvasElement | OffscreenCanvas, CanvasParticleSystem>();

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

	const isBold = fontFamily.includes('VT323') || fontFamily.includes('Terminal');
	ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
	ctx.textBaseline = 'top';
	const parsed = parseAsciiOutput(asciiOutput);
	const lines = parsed.lines;
	const maxLineLength = Math.max(...lines.map((line) => line.text.length), 1);

	// Retrieve charWidth from cache if available
	const cacheKey = `${isBold ? 'bold-' : ''}${fontSize}-${fontFamily}`;
	let charWidth = charWidthCache.get(cacheKey);
	if (charWidth === undefined) {
		const metrics = ctx.measureText('M');
		charWidth = metrics.width;
		charWidthCache.set(cacheKey, charWidth);
	}

	const lineHeight = fontSize;
	const canvasWidth = Math.ceil(maxLineLength * charWidth);
	const canvasHeight = Math.ceil(lines.length * lineHeight);

	// Resize canvas only if dimensions changed to avoid canvas context resets
	if (canvas.width !== canvasWidth) {
		canvas.width = canvasWidth;
	}
	if (canvas.height !== canvasHeight) {
		canvas.height = canvasHeight;
	}

	// Re-apply font after resize (canvas reset)
	ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
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

	let system = particleSystems.get(canvas);
	const cols = maxLineLength;
	const rows = lines.length;

	if (!system) {
		system = new CanvasParticleSystem(lines, cols, rows, charWidth, lineHeight);
		particleSystems.set(canvas, system);
	} else {
		system.updateFrame(lines, cols, rows, charWidth, lineHeight);
	}

	const mouseX = options.mousePos ? options.mousePos.x : null;
	const mouseY = options.mousePos ? options.mousePos.y : null;
	const physicsActive = system.update(mouseX, mouseY, fontSize, charWidth, lineHeight);

	const colorBatches = new Map<string, Array<{ char: string; x: number; y: number }>>();

	for (const p of system.particles) {
		if (p.char === ' ') continue;

		const resolvedColor = options.customTintColor || p.color;
		let batch = colorBatches.get(resolvedColor);
		if (!batch) {
			batch = [];
			colorBatches.set(resolvedColor, batch);
		}
		batch.push({ char: p.char, x: p.x, y: p.y });
	}

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
		maxLineLength,
		physicsActive
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
