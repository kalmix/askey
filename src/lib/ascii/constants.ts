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
	None: 'none'
	// !TODO: Implement these dithering methods
	// 'Jarvis-Judice-Ninke': 'jarvis-judice-ninke',
	// 'Floyd-Steinberg': 'floyd-steinberg',
	// Atkinson: 'atkinson',
	// Ordered: 'ordered'
} as const;

export type GradientName = keyof typeof ASCII_GRADIENTS;
export type DitheringName = keyof typeof DITHERING_METHODS;

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
	animationFrameLimit: 150,
	animationFrameSkip: 1,
	animationPlaybackSpeed: 8
};

export type ControlState = typeof DEFAULT_CONTROLS;

export const RENDER_MODE_OPTIONS = [
	{ value: 'canvas', label: 'Canvas (Default)' },
	{ value: 'dom', label: 'DOM/HTML (Slower)' }
];
