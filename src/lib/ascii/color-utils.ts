/**
 * Color utility functions for performance optimization
 */

// Cache for RGB to Hex conversions
const rgbToHexCache = new Map<string, string>();
// Cache for RGB to rgb() strings
const rgbToStringCache = new Map<string, string>();
// Increased cache size to handle typical animation workloads
const MAX_CACHE_SIZE = 50000;

export function rgbToHex(r: number, g: number, b: number): string {
	const key = `${r},${g},${b}`;

	let hex = rgbToHexCache.get(key);
	if (hex) {
		return hex;
	}
	const toHex = (n: number) => n.toString(16).padStart(2, '0');
	hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

	if (rgbToHexCache.size >= MAX_CACHE_SIZE) {
		const firstKey = rgbToHexCache.keys().next().value;
		if (firstKey !== undefined) {
			rgbToHexCache.delete(firstKey);
		}
	}

	rgbToHexCache.set(key, hex);
	return hex;
}

export function rgbToRgbString(r: number, g: number, b: number): string {
	const key = `${r},${g},${b}`;

	let rgbString = rgbToStringCache.get(key);
	if (rgbString) {
		return rgbString;
	}

	rgbString = `rgb(${r}, ${g}, ${b})`;

	if (rgbToStringCache.size >= MAX_CACHE_SIZE) {
		const firstKey = rgbToStringCache.keys().next().value;
		if (firstKey !== undefined) {
			rgbToStringCache.delete(firstKey);
		}
	}

	rgbToStringCache.set(key, rgbString);
	return rgbString;
}

/**
 * Parse RGB string to hex with caching
 */
export function parseRgbToHex(rgbString: string): string | null {
	const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (!match) return null;

	const r = parseInt(match[1]);
	const g = parseInt(match[2]);
	const b = parseInt(match[3]);

	return rgbToHex(r, g, b);
}

/**
 * Clear the color cache
 */
export function clearColorCache(): void {
	rgbToHexCache.clear();
	rgbToStringCache.clear();
}

/**
 * Get cache statistics
 */
export function getColorCacheStats(): {
	hexCacheSize: number;
	stringCacheSize: number;
	maxSize: number;
} {
	return {
		hexCacheSize: rgbToHexCache.size,
		stringCacheSize: rgbToStringCache.size,
		maxSize: MAX_CACHE_SIZE
	};
}
