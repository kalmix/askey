declare module 'upng-js' {
	interface UPNGImage {
		width: number;
		height: number;
		frames?: Array<{
			delay?: number;
		}>;
	}

	type DecodeResult = UPNGImage & {
		data: ArrayBuffer;
	};

	const UPNG: {
		decode(buffer: ArrayBuffer): DecodeResult;
		toRGBA8(img: DecodeResult): ArrayBuffer[];
		encode(
			frames: ArrayBuffer[] | Uint8Array[] | Uint8ClampedArray[],
			width: number,
			height: number,
			colors?: number,
			delays?: number[]
		): ArrayBuffer;
	};

	export default UPNG;
}
