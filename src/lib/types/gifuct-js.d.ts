declare module 'gifuct-js' {
	export interface GifDimensions {
		top: number;
		left: number;
		width: number;
		height: number;
	}

	export interface ParsedGif {
		lsd: {
			width: number;
			height: number;
		};
	}

	export interface GifFrame {
		delay?: number;
		disposalType?: number;
		dims: GifDimensions;
		patch: Uint8ClampedArray;
	}

	export function parseGIF(buffer: ArrayBuffer): ParsedGif;
	export function decompressFrames(parsed: ParsedGif, buildImagePatches?: boolean): GifFrame[];
}
