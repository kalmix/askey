export const ASCII_GRADIENTS = {
	'Extended High': " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
	Standard: ' .:-=+*#%@',
	Blocks: ' ░▒▓█',
	Simple: ' .-+*#@',
	Detailed: " .`-_':,;^=+/\"|)\\<>)iv%xclrs{*}I?!][1taeo7zjLunT#JCwfy325Fh9kP6qpdbEAmg04AGD@XROS8B&QNMW",
	'Short Dense': ' .:oO8@',
	'Binary': ' .01',
	'Minimal': ' .:=#',
	'Numbers': ' 1234567890',
	'Letters': ' abcdefghijklm',
	'donut.c': ' .,-~:;=!*#$@',
	'Box Drawing': ' ─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬█',
	'ASCII Art': ' .,;:clodxkO0KXNWM',
	'Braille (weird width)': ' ⠁⠃⠇⠋⠛⠿',
	'Kalmix Gradient': ' kalmix.,:;iIl!+*%$@',
} as const;

export const DITHERING_METHODS = {
	None: 'none',
	// !TODO: Implement these dithering methods
	// 'Jarvis-Judice-Ninke': 'jarvis-judice-ninke',
	// 'Floyd-Steinberg': 'floyd-steinberg',
	// Atkinson: 'atkinson',
	// Ordered: 'ordered'
} as const;

export type GradientName = keyof typeof ASCII_GRADIENTS;
export type DitheringName = keyof typeof DITHERING_METHODS;
