import { TRANSPARENCY_SAMPLE_LIMIT } from './constants';

function createSampleCanvas(width: number, height: number) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas.getContext('2d', { willReadFrequently: true });
}

export function inspectTransparency(
	source: CanvasImageSource,
	width: number,
	height: number,
	sampleLimit = TRANSPARENCY_SAMPLE_LIMIT
) {
	const maxDimension = Math.max(1, Math.max(width, height));
	const scale = Math.min(1, sampleLimit / maxDimension);
	const scaledWidth = Math.max(1, Math.round(width * scale));
	const scaledHeight = Math.max(1, Math.round(height * scale));
	const context = createSampleCanvas(scaledWidth, scaledHeight);
	if (!context) return false;
	context.drawImage(source, 0, 0, scaledWidth, scaledHeight);
	const imageData = context.getImageData(0, 0, scaledWidth, scaledHeight).data;
	for (let index = 3; index < imageData.length; index += 4) {
		if (imageData[index] < 255) {
			return true;
		}
	}
	return false;
}

export async function detectImageTransparency(file: File, objectUrl?: string) {
	if (typeof window === 'undefined') return false;
	try {
		if (typeof createImageBitmap === 'function') {
			const bitmap = await createImageBitmap(file);
			try {
				return inspectTransparency(bitmap, bitmap.width, bitmap.height);
			} finally {
				if (typeof bitmap.close === 'function') {
					bitmap.close();
				}
			}
		}
	} catch (error) {
		console.warn('ImageBitmap transparency check failed', error);
	}

	const reuseUrl = objectUrl ?? URL.createObjectURL(file);
	const shouldRevoke = !objectUrl;
	return await new Promise<boolean>((resolve) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.onload = () => {
			try {
				resolve(inspectTransparency(image, image.naturalWidth, image.naturalHeight));
			} catch (error) {
				console.warn('Fallback transparency check failed', error);
				resolve(false);
			} finally {
				if (shouldRevoke) {
					URL.revokeObjectURL(reuseUrl);
				}
			}
		};
		image.onerror = () => {
			if (shouldRevoke) {
				URL.revokeObjectURL(reuseUrl);
			}
			resolve(false);
		};
		image.src = reuseUrl;
	});
}
