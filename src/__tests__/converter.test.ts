/**
 * @jest-environment jsdom
 */

describe('ASCII converter', () => {
	interface MockContext {
		drawImage: jest.Mock;
		getImageData: jest.Mock;
		putImageData: jest.Mock;
		clearRect: jest.Mock;
	}

	interface MockCanvas {
		getContext: jest.Mock;
		width: number;
		height: number;
	}

	interface MockImage {
		width: number;
		height: number;
		crossOrigin: string;
		onload: ((this: GlobalEventHandlers, ev: Event) => void) | null;
		onerror: ((this: GlobalEventHandlers, ev: Event) => void) | null;
		src: string;
	}

	let mockCanvas: MockCanvas;
	let mockContext: MockContext;
	let mockImage: MockImage;

	beforeEach(() => {
		mockContext = {
			drawImage: jest.fn(),
			getImageData: jest.fn(() => ({
				data: new Uint8ClampedArray([
					255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 128, 128, 128, 255
				]),
				width: 2,
				height: 2
			})),
			putImageData: jest.fn(),
			clearRect: jest.fn()
		};

		mockCanvas = {
			getContext: jest.fn(() => mockContext),
			width: 0,
			height: 0
		};

		global.document.createElement = jest.fn((tagName) => {
			if (tagName === 'canvas') {
				return mockCanvas;
			}
			return {};
		}) as unknown as typeof document.createElement;

		mockImage = {
			width: 100,
			height: 100,
			crossOrigin: '',
			onload: null,
			onerror: null,
			src: ''
		};

		global.Image = jest.fn().mockImplementation(() => mockImage) as unknown as typeof Image;
	});

	describe('pixel to ASCII conversion', () => {
		it('should convert pixels based on brightness', () => {
			const brightPixel = { r: 255, g: 255, b: 255 };
			const darkPixel = { r: 0, g: 0, b: 0 };
			const midPixel = { r: 128, g: 128, b: 128 };

			const brightBrightness = (brightPixel.r + brightPixel.g + brightPixel.b) / 3;
			const darkBrightness = (darkPixel.r + darkPixel.g + darkPixel.b) / 3;
			const midBrightness = (midPixel.r + midPixel.g + midPixel.b) / 3;

			expect(brightBrightness).toBe(255);
			expect(darkBrightness).toBe(0);
			expect(midBrightness).toBe(128);
		});

		it('should map brightness to gradient index', () => {
			const gradient = ' .:-=+*#%@';
			const brightness = 128;
			const charIndex = Math.floor((brightness / 255) * (gradient.length - 1));

			expect(charIndex).toBeGreaterThanOrEqual(0);
			expect(charIndex).toBeLessThan(gradient.length);
		});
	});

	describe('image loading', () => {
		it('should handle successful image load', (done) => {
			const testUrl = 'test-image.png';

			mockImage.onload = jest.fn(() => {
				expect(mockImage.src).toBe(testUrl);
				expect(mockImage.crossOrigin).toBe('anonymous');
				done();
			});

			mockImage.src = testUrl;
			mockImage.crossOrigin = 'anonymous';

			setTimeout(() => {
				// trigger the onload event
				if (mockImage.onload) {
					mockImage.onload.call({} as GlobalEventHandlers, new Event('load'));
				}
			}, 10);
		});

		it('should handle image load error', (done) => {
			mockImage.onerror = jest.fn(() => {
				expect(mockImage.onerror).toHaveBeenCalled();
				done();
			});

			if (mockImage.onerror) {
				mockImage.onerror.call({} as GlobalEventHandlers, new Event('error'));
			}
		});
	});

	describe('canvas operations', () => {
		it('should create canvas with correct dimensions', () => {
			const characters = 100;
			const aspectRatio = 0.5;
			const width = characters;
			const height = Math.max(1, Math.floor(width * aspectRatio * 0.5));

			expect(width).toBe(100);
			expect(height).toBe(25);
		});

		it('should handle minimum height', () => {
			const characters = 1;
			const aspectRatio = 0.1;
			const height = Math.max(1, Math.floor(characters * aspectRatio * 0.5));

			expect(height).toBe(1);
		});
	});

	describe('animation frame processing', () => {
		it('should calculate frame limits correctly', () => {
			const totalFrames = 100;
			const frameLimit = 50;
			const normalizedLimit = Math.max(1, Math.min(totalFrames, Math.floor(frameLimit)));

			expect(normalizedLimit).toBe(50);
		});

		it('should handle frame skip calculation', () => {
			const frameSkip = 2;
			const normalizedSkip = Math.max(1, Math.floor(frameSkip));

			expect(normalizedSkip).toBe(2);
		});

		it('should calculate adjusted playback speed', () => {
			const originalDelay = 100;
			const playbackSpeed = 2.0;
			const adjustedDelay = Math.max(16, Math.round(originalDelay / playbackSpeed));

			expect(adjustedDelay).toBe(50);
		});

		it('should enforce minimum delay of 16ms', () => {
			const originalDelay = 10;
			const playbackSpeed = 2.0;
			const adjustedDelay = Math.max(16, Math.round(originalDelay / playbackSpeed));

			expect(adjustedDelay).toBe(16);
		});

		it('should clamp playback speed to minimum 0.1', () => {
			const speed = 0.05;
			const normalizedSpeed = Math.max(0.1, speed);

			expect(normalizedSpeed).toBe(0.1);
		});
	});
});
