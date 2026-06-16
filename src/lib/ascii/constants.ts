export const ASCII_GRADIENTS = {
	'Extended High': ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
	Standard: ' .:-=+*#%@',
	Blocks: ' ░▒▓█',
	Simple: ' .-+*#@',
	Detailed:
		' .`-_\':,;^=+/"|)\\<>)iv%xclrs{*}I?!][1taeo7zjLunT#JCwfy325Fh9kP6qpdbEAmg04AGD@XROS8B&QNMW',
	'Short Dense': ' .:oO8@',
	Binary: ' .01',
	Minimal: ' .:=#',
	Numbers: ' 1234567890',
	Letters: ' abcdefghijklm',
	'donut.c': ' .,-~:;=!*#$@',
	'Box Drawing': ' ─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬█',
	'ASCII Art': ' .,;:clodxkO0KXNWM',
	Braille: ' ⠁⠃⠇⠋⠛⠿',
	'Kalmix Gradient': ' kalmix.,:;iIl!+*%$@',
	dots: ' .;'
} as const;

export const DITHERING_METHODS = {
	None: 'none',
	'Floyd-Steinberg': 'floyd-steinberg',
	Atkinson: 'atkinson',
	Ordered: 'ordered'
} as const;

export const RETRO_PALETTES = {
	c64: [
		{ r: 0, g: 0, b: 0 },
		{ r: 255, g: 255, b: 255 },
		{ r: 136, g: 57, b: 50 },
		{ r: 103, g: 182, b: 189 },
		{ r: 139, g: 63, b: 150 },
		{ r: 85, g: 160, b: 73 },
		{ r: 64, g: 49, b: 141 },
		{ r: 191, g: 206, b: 114 },
		{ r: 139, g: 84, b: 47 },
		{ r: 87, g: 66, b: 0 },
		{ r: 184, g: 105, b: 98 },
		{ r: 80, g: 80, b: 80 },
		{ r: 120, g: 120, b: 120 },
		{ r: 148, g: 224, b: 137 },
		{ r: 120, g: 105, b: 196 },
		{ r: 159, g: 159, b: 159 }
	],
	gameboy: [
		{ r: 15, g: 56, b: 15 },
		{ r: 48, g: 98, b: 48 },
		{ r: 139, g: 172, b: 15 },
		{ r: 155, g: 188, b: 15 }
	],
	cga: [
		{ r: 0, g: 0, b: 0 },
		{ r: 85, g: 255, b: 255 },
		{ r: 255, g: 55, b: 255 },
		{ r: 255, g: 255, b: 255 }
	],
	nes: [
		{ r: 0, g: 0, b: 0 },
		{ r: 255, g: 255, b: 255 },
		{ r: 216, g: 0, b: 0 },
		{ r: 0, g: 168, b: 0 },
		{ r: 0, g: 56, b: 203 },
		{ r: 248, g: 120, b: 248 },
		{ r: 248, g: 184, b: 0 },
		{ r: 252, g: 152, b: 56 },
		{ r: 56, g: 192, b: 252 },
		{ r: 0, g: 0, b: 188 },
		{ r: 104, g: 0, b: 168 },
		{ r: 0, g: 168, b: 200 },
		{ r: 248, g: 184, b: 248 },
		{ r: 0, g: 232, b: 0 },
		{ r: 60, g: 188, b: 252 },
		{ r: 168, g: 168, b: 168 }
	],
	pico8: [
		{ r: 0, g: 0, b: 0 },
		{ r: 29, g: 43, b: 83 },
		{ r: 126, g: 37, b: 83 },
		{ r: 0, g: 135, b: 81 },
		{ r: 171, g: 82, b: 54 },
		{ r: 95, g: 87, b: 79 },
		{ r: 194, g: 195, b: 199 },
		{ r: 255, g: 241, b: 232 },
		{ r: 255, g: 0, b: 77 },
		{ r: 255, g: 163, b: 0 },
		{ r: 255, g: 236, b: 39 },
		{ r: 0, g: 228, b: 54 },
		{ r: 41, g: 173, b: 255 },
		{ r: 131, g: 118, b: 156 },
		{ r: 255, g: 119, b: 168 },
		{ r: 255, g: 204, b: 170 }
	]
} as const;

export type GradientName = keyof typeof ASCII_GRADIENTS;
export type DitheringName = keyof typeof DITHERING_METHODS;
export type PaletteName = keyof typeof RETRO_PALETTES;

export const DEFAULT_CONTROLS = {
	characters: 85,
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
	colorPalette: 'None' as 'None' | PaletteName,
	colorQuantization: 16,
	interactiveHover: false,
	phosphorDecay: 0,
	animationFrameLimit: 150,
	animationFrameSkip: 1,
	animationPlaybackSpeed: 8
};

export type ControlState = typeof DEFAULT_CONTROLS;

export const RENDER_MODE_OPTIONS = [
	{ value: 'canvas', label: 'Canvas (Default)' },
	{ value: 'dom', label: 'DOM/HTML (Slower)' }
];
