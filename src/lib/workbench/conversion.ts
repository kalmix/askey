import { convertAnimationToAscii, convertImageToAscii, type ConvertedAsciiFrame } from '$lib/ascii/converter';
import { extractApngFrames, extractGifFrames } from '$lib/ascii/animation';
import type { ControlState } from './constants';

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

export async function convertSourceToAscii({ imageUrl, controls, animation }: ConversionRequest): Promise<ConversionResponse> {
	if (!imageUrl) {
		return { asciiOutput: '', asciiFrames: [] };
	}

	if (animation.isAnimatedImage && animation.file) {
		let animInfo;
		if (animation.format === 'gif') {
			animInfo = await extractGifFrames(animation.file);
		} else if (animation.format === 'apng') {
			animInfo = await extractApngFrames(animation.file);
		}

		if (!animInfo || animInfo.frames.length === 0) {
			throw new Error('Failed to extract frames from the animation.');
		}

		const frames = await convertAnimationToAscii(animInfo, controls);

		if (!frames.length) {
			throw new Error('Failed to convert animation frames to ASCII.');
		}

		return {
			asciiFrames: frames,
			asciiOutput: frames[0]?.ascii ?? ''
		};
	}

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
