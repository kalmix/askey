import { decompressFrames, parseGIF } from 'gifuct-js';
import UPNG from 'upng-js';

export interface AnimationFrame {
	imageData: ImageData;
	delay: number; 
}

export interface AnimationInfo {
	frames: AnimationFrame[];
	width: number;
	height: number;
	isAnimated: boolean;
}

export async function extractGifFrames(file: File): Promise<AnimationInfo> {
	const arrayBuffer = await file.arrayBuffer();
	if (!arrayBuffer || arrayBuffer.byteLength === 0) {
		throw new Error('Invalid or empty GIF file');
	}
	const frames = await parseGifFrames(new Uint8Array(arrayBuffer));
	if (!frames || frames.frames.length === 0) {
		throw new Error('No frames found in GIF file');
	}
	return frames;
}

export async function extractApngFrames(file: File): Promise<AnimationInfo> {
	const arrayBuffer = await file.arrayBuffer();
	if (!arrayBuffer || arrayBuffer.byteLength === 0) {
		throw new Error('Invalid or empty APNG file');
	}
	const frames = await parseApngFrames(new Uint8Array(arrayBuffer));
	if (!frames || frames.frames.length === 0) {
		throw new Error('No frames found in APNG file');
	}
	return frames;
}

export async function detectAnimatedFormat(file: File): Promise<'gif' | 'apng' | 'none'> {
	const arrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);  

	
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
		
		if (bytes[3] === 0x38 && bytes[4] === 0x39 && bytes[5] === 0x61) {
			
			let imageDescriptorCount = 0;
			for (let i = 0; i < bytes.length - 1; i++) {
				if (bytes[i] === 0x2C) { 
					imageDescriptorCount++;
					if (imageDescriptorCount > 1) {
						return 'gif';
					}
				}
			}
		}
	}

	
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
		
		for (let i = 8; i < bytes.length - 4; i++) {
			if (bytes[i] === 0x61 && bytes[i + 1] === 0x63 && 
			    bytes[i + 2] === 0x54 && bytes[i + 3] === 0x4C) {
				return 'apng';
			}
		}
	}

	return 'none';
}

async function parseGifFrames(bytes: Uint8Array): Promise<AnimationInfo> {
	if (typeof document === 'undefined') {
		return { frames: [], width: 0, height: 0, isAnimated: false };
	}

	try {
		const precise = decodeGifWithGifuct(bytes);
		if (precise.frames.length > 0) {
			return precise;
		}
	} catch (error) {
		console.warn('Precise GIF parsing failed, falling back to canvas capture', error);
	}

	return await captureGifWithCanvas(bytes);
}

function decodeGifWithGifuct(bytes: Uint8Array): AnimationInfo {
	const buffer = bytes.slice().buffer;
	const parsedGif = parseGIF(buffer);
	const rawFrames = decompressFrames(parsedGif, true);
	const width = parsedGif.lsd.width;
	const height = parsedGif.lsd.height;
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d', { willReadFrequently: true });

	if (!ctx) {
		return { frames: [], width: 0, height: 0, isAnimated: false };
	}

	canvas.width = width;
	canvas.height = height;
	const frames: AnimationFrame[] = [];

	for (const frame of rawFrames) {
		const patchArray = new Uint8ClampedArray(frame.patch);
		const patch = new ImageData(patchArray, frame.dims.width, frame.dims.height);
		let restoreImage: ImageData | null = null;
		if (frame.disposalType === 3) {
			restoreImage = ctx.getImageData(0, 0, width, height);
		}

		ctx.putImageData(patch, frame.dims.left, frame.dims.top);
		const frameImageData = ctx.getImageData(0, 0, width, height);
		const frameDelayHundredths = typeof frame.delay === 'number' && !Number.isNaN(frame.delay) ? frame.delay : 10;
		const delay = Math.max(frameDelayHundredths, 2) * 10; 
		frames.push({ imageData: frameImageData, delay });

		if (frame.disposalType === 2) {
			ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
		} else if (frame.disposalType === 3 && restoreImage) {
			ctx.putImageData(restoreImage, 0, 0);
		}
	}

	return {
		frames,
		width,
		height,
		isAnimated: frames.length > 1
	};
}

async function captureGifWithCanvas(bytes: Uint8Array): Promise<AnimationInfo> {
	const blob = new Blob([bytes as BlobPart], { type: 'image/gif' });
	const url = URL.createObjectURL(blob);

	try {
		const animInfo = await extractFramesFromAnimatedImage(url);
		if (animInfo.frames.length === 0) {
			const img = await loadImageElement(url);
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d', { willReadFrequently: true });

			if (!ctx) {
				throw new Error('Failed to get canvas context');
			}

			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			ctx.drawImage(img, 0, 0);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			return {
				frames: [{ imageData, delay: 100 }],
				width: canvas.width,
				height: canvas.height,
				isAnimated: false
			};
		}

		return animInfo;
	} finally {
		URL.revokeObjectURL(url);
	}
}

async function extractFramesFromAnimatedImage(url: string): Promise<AnimationInfo> {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d', { willReadFrequently: true });
			
			if (!ctx) {
				resolve({ frames: [], width: 0, height: 0, isAnimated: false });
				return;
			}

			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;

			
			const frames: AnimationFrame[] = [];
			const frameCount = 15; 
			const delay = 100; 
			let captureCount = 0;

			
			const captureFrame = () => {
				if (captureCount >= frameCount) {
					resolve({
						frames,
						width: canvas.width,
						height: canvas.height,
						isAnimated: frames.length > 1
					});
					return;
				}

				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				frames.push({ imageData, delay });
				
				captureCount++;
				setTimeout(() => requestAnimationFrame(captureFrame), delay);
			};

			
			setTimeout(() => requestAnimationFrame(captureFrame), 50);
		};

		img.onerror = () => {
			resolve({ frames: [], width: 0, height: 0, isAnimated: false });
		};

		img.src = url;
	});
}


async function parseApngFrames(bytes: Uint8Array): Promise<AnimationInfo> {
	if (typeof document === 'undefined') {
		return { frames: [], width: 0, height: 0, isAnimated: false };
	}

	try {
		const decoded = decodeApngWithUpng(bytes);
		if (decoded.frames.length > 0) {
			return decoded;
		}
	} catch (error) {
		console.warn('UPNG decode failed, falling back to static frame', error);
	}


	return await decodeApngAsStaticImage(bytes);
}

function decodeApngWithUpng(bytes: Uint8Array): AnimationInfo {
	const buffer = bytes.slice().buffer;
	const png = UPNG.decode(buffer);
	const rgbaFrames = UPNG.toRGBA8(png);
	const width = png.width;
	const height = png.height;

	if (!rgbaFrames || rgbaFrames.length === 0) {
		return { frames: [], width, height, isAnimated: false };
	}

	const frames: AnimationFrame[] = [];

	for (let index = 0; index < rgbaFrames.length; index++) {
		const rgbaBuffer = rgbaFrames[index];
		const rgba = new Uint8ClampedArray(rgbaBuffer);
		const imageData = new ImageData(rgba, width, height);
		const rawDelay = png.frames?.[index]?.delay;
		const delay = rawDelay && rawDelay > 0 ? Math.max(rawDelay, 16) : 100;
		frames.push({ imageData, delay });
	}

	return {
		frames,
		width,
		height,
		isAnimated: frames.length > 1
	};
}

async function decodeApngAsStaticImage(bytes: Uint8Array): Promise<AnimationInfo> {
	const blob = new Blob([bytes as BlobPart], { type: 'image/png' });
	const url = URL.createObjectURL(blob);

	try {
		const img = await loadImageElement(url);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d', { willReadFrequently: true });

		if (!ctx) {
			throw new Error('Failed to get canvas context');
		}

		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		ctx.drawImage(img, 0, 0);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		const frames: AnimationFrame[] = [{
			imageData,
			delay: 100
		}];

		return {
			frames,
			width: canvas.width,
			height: canvas.height,
			isAnimated: false
		};
	} finally {
		URL.revokeObjectURL(url);
	}
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to load image from URL'));
		img.src = url;
	});
}
