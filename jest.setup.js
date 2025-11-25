import '@testing-library/jest-dom';

global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
	if (type === '2d') {
		const imageData = {
			data: new Uint8ClampedArray(400 * 400 * 4).fill(128),
			width: 400,
			height: 400
		};

		return {
			drawImage: jest.fn(),
			getImageData: jest.fn(() => imageData),
			putImageData: jest.fn(),
			clearRect: jest.fn(),
			fillRect: jest.fn(),
			fillText: jest.fn(),
			measureText: jest.fn(() => ({ width: 10 }))
		};
	}
	return null;
});

global.Image = class MockImage {
	constructor() {
		this.crossOrigin = '';
		setTimeout(() => {
			if (this.onload) {
				this.onload();
			}
		}, 0);
	}

	get width() {
		return 400;
	}
	get height() {
		return 400;
	}
	set src(value) {
		this._src = value;
	}
	get src() {
		return this._src;
	}
};
