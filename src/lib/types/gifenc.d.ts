declare module 'gifenc' {
	type RgbaBuffer = Uint8Array | Uint8ClampedArray;

	export interface GIFEncoderOptions {
		initialCapacity?: number;
		auto?: boolean;
	}

	export interface GIFFrameOptions {
		palette: number[][];
		delay?: number;
		repeat?: number;
		transparent?: boolean;
		transparentIndex?: number;
		colorDepth?: number;
		dispose?: number;
	}

	export interface GIFEncoderInstance {
		reset(): void;
		finish(): void;
		bytes(): Uint8Array;
		bytesView(): Uint8Array;
		writeHeader(
			width: number,
			height: number,
			options?: { palette?: number[][]; colorDepth?: number }
		): void;
		writeFrame(pixels: Uint8Array, width: number, height: number, options: GIFFrameOptions): void;
	}

	export function GIFEncoder(options?: GIFEncoderOptions): GIFEncoderInstance;
	export function quantize(
		data: RgbaBuffer,
		maxColors: number,
		options?: {
			format?: 'rgb565' | 'rgba4444' | 'rgb444';
			clearAlpha?: boolean;
			clearAlphaColor?: number;
			clearAlphaThreshold?: number;
			oneBitAlpha?: boolean | number;
			useSqrt?: boolean;
		}
	): number[][];
	export function applyPalette(
		data: RgbaBuffer,
		palette: number[][],
		format?: 'rgb565' | 'rgba4444' | 'rgb444'
	): Uint8Array;

	const defaultEncoder: typeof GIFEncoder;
	export default defaultEncoder;
}
