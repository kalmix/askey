const HEX_COLOR_REGEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizeHexColor(input: string, fallback = '#000000') {
	const trimmed = (input ?? '').trim();
	if (!HEX_COLOR_REGEX.test(trimmed)) {
		return fallback;
	}
	const value = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
	return value.length === 4
		? `#${value
				.slice(1)
				.split('')
				.map((char) => `${char}${char}`)
				.join('')}`.toUpperCase()
		: value.toUpperCase();
}

export function parseHexColor(value: string) {
	const safeValue = sanitizeHexColor(value);
	const hex = safeValue.replace('#', '');
	const r = Number.parseInt(hex.slice(0, 2), 16) || 0;
	const g = Number.parseInt(hex.slice(2, 4), 16) || 0;
	const b = Number.parseInt(hex.slice(4, 6), 16) || 0;
	return { r, g, b };
}

export function clampPercentage(value: number) {
	if (Number.isNaN(value)) return 0;
	return Math.min(100, Math.max(0, value));
}

export function getOpacityFromPercent(percent: number) {
	return clampPercentage(percent) / 100;
}

export function getRgbaColor(hex: string, percentAlpha: number) {
	const { r, g, b } = parseHexColor(hex);
	return `rgba(${r}, ${g}, ${b}, ${getOpacityFromPercent(percentAlpha).toFixed(2)})`;
}
