import type { DitheringName, GradientName } from '$lib/ascii/constants';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'theme';

export const FLOAT_TOLERANCE = 0.0001;

export const TRANSPARENCY_SAMPLE_LIMIT = 512;

export const DEFAULT_CONTROLS = {
	characters: 100,
	brightness: 100,
	contrast: 100,
	saturation: 100,
	hue: 0,
	grayscale: 0,
	sepia: 0,
	invertColors: 0,
	thresholding: 128,
	sharpness: 0,
	edgeDetection: 1,
	spaceDensity: 1,
	selectedGradient: 'Extended High' as GradientName,
	ditheringMethod: 'None' as DitheringName,
	animationFrameLimit: 150,
	animationFrameSkip: 1,
	animationPlaybackSpeed: 8
};

export type ControlState = typeof DEFAULT_CONTROLS;
