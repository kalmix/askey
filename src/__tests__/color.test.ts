import {
	sanitizeHexColor,
	parseHexColor,
	clampPercentage,
	getOpacityFromPercent,
	getRgbaColor
} from '../lib/workbench/color';

describe('color utilities', () => {
	describe('sanitizeHexColor', () => {
		it('should handle valid 6-digit hex colors', () => {
			expect(sanitizeHexColor('#FF5733')).toBe('#FF5733');
			expect(sanitizeHexColor('FF5733')).toBe('#FF5733');
			expect(sanitizeHexColor('#ff5733')).toBe('#FF5733');
		});

		it('should expand 3-digit hex colors to 6 digits', () => {
			expect(sanitizeHexColor('#F00')).toBe('#FF0000');
			expect(sanitizeHexColor('F00')).toBe('#FF0000');
			expect(sanitizeHexColor('#abc')).toBe('#AABBCC');
		});

		it('should return fallback for invalid colors', () => {
			expect(sanitizeHexColor('invalid')).toBe('#000000');
			expect(sanitizeHexColor('#GGGGGG')).toBe('#000000');
			expect(sanitizeHexColor('')).toBe('#000000');
			expect(sanitizeHexColor('#12')).toBe('#000000');
		});

		it('should use custom fallback when provided', () => {
			expect(sanitizeHexColor('invalid', '#FFFFFF')).toBe('#FFFFFF');
		});
	});

	describe('parseHexColor', () => {
		it('should parse hex color to RGB values', () => {
			expect(parseHexColor('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
			expect(parseHexColor('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
			expect(parseHexColor('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
		});

		it('should handle colors without # prefix', () => {
			expect(parseHexColor('FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
		});

		it('should handle 3-digit hex colors', () => {
			expect(parseHexColor('#F00')).toEqual({ r: 255, g: 0, b: 0 });
		});
	});

	describe('clampPercentage', () => {
		it('should clamp values between 0 and 100', () => {
			expect(clampPercentage(50)).toBe(50);
			expect(clampPercentage(0)).toBe(0);
			expect(clampPercentage(100)).toBe(100);
		});

		it('should clamp values below 0', () => {
			expect(clampPercentage(-10)).toBe(0);
			expect(clampPercentage(-100)).toBe(0);
		});

		it('should clamp values above 100', () => {
			expect(clampPercentage(150)).toBe(100);
			expect(clampPercentage(200)).toBe(100);
		});

		it('should return 0 for NaN', () => {
			expect(clampPercentage(NaN)).toBe(0);
		});
	});

	describe('getOpacityFromPercent', () => {
		it('should convert percentage to opacity', () => {
			expect(getOpacityFromPercent(100)).toBe(1);
			expect(getOpacityFromPercent(50)).toBe(0.5);
			expect(getOpacityFromPercent(0)).toBe(0);
		});

		it('should handle out of range values', () => {
			expect(getOpacityFromPercent(150)).toBe(1);
			expect(getOpacityFromPercent(-50)).toBe(0);
		});
	});

	describe('getRgbaColor', () => {
		it('should create rgba string from hex and alpha', () => {
			expect(getRgbaColor('#FF0000', 100)).toBe('rgba(255, 0, 0, 1.00)');
			expect(getRgbaColor('#00FF00', 50)).toBe('rgba(0, 255, 0, 0.50)');
			expect(getRgbaColor('#0000FF', 0)).toBe('rgba(0, 0, 255, 0.00)');
		});

		it('should handle 3-digit hex colors', () => {
			expect(getRgbaColor('#F00', 100)).toBe('rgba(255, 0, 0, 1.00)');
		});
	});
});
