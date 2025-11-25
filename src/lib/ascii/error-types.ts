export enum WasmErrorType {
	WASM_UNREACHABLE = 'WASM_UNREACHABLE',
	WASM_OUT_OF_MEMORY = 'WASM_OUT_OF_MEMORY',
	TIMEOUT = 'TIMEOUT',
	VALIDATION = 'VALIDATION',
	UNKNOWN = 'UNKNOWN'
}

export interface WasmErrorContext {
	frameCount?: number;
	width?: number;
	height?: number;
	quality?: number;
	estimatedMemoryMB?: number;
	operation?: string;
}

export interface WasmError {
	type: WasmErrorType;
	message: string;
	context: WasmErrorContext;
	timestamp: number;
	originalError?: string;
}

export function classifyError(error: Error | unknown): WasmErrorType {
	const errorMsg = error instanceof Error ? error.message : String(error);
	const errorName = error instanceof Error ? error.constructor?.name : '';

	if (errorMsg.includes('unreachable') || errorName === 'RuntimeError') {
		return WasmErrorType.WASM_UNREACHABLE;
	}
	if (errorMsg.includes('out of memory') || errorMsg.includes('memory')) {
		return WasmErrorType.WASM_OUT_OF_MEMORY;
	}
	if (errorMsg.includes('timeout')) {
		return WasmErrorType.TIMEOUT;
	}
	if (errorMsg.includes('invalid') || errorMsg.includes('validation')) {
		return WasmErrorType.VALIDATION;
	}
	return WasmErrorType.UNKNOWN;
}

export function createErrorMessage(wasmError: WasmError): string {
	const { type, context } = wasmError;
	const { frameCount, width, height, quality } = context;

	let message = wasmError.message;
	const suggestions: string[] = [];

	switch (type) {
		case WasmErrorType.WASM_UNREACHABLE:
			message = `GIF encoding failed: The animation is too complex for the encoder.`;
			if (frameCount) suggestions.push(`reduce frame count (currently ${frameCount})`);
			if (width && height)
				suggestions.push(`reduce character count (currently ${width}×${height})`);
			if (quality) suggestions.push(`lower quality setting (currently ${quality})`);
			break;

		case WasmErrorType.WASM_OUT_OF_MEMORY:
			message = `Out of memory: The animation requires too much memory to encode.`;
			if (frameCount) suggestions.push(`reduce frame count (currently ${frameCount})`);
			if (width && height) suggestions.push(`reduce dimensions (currently ${width}×${height})`);
			break;

		case WasmErrorType.TIMEOUT:
			message = `Encoding timed out: The operation took too long.`;
			if (frameCount) suggestions.push(`reduce frame count (currently ${frameCount})`);
			if (width && height) suggestions.push(`reduce dimensions (currently ${width}×${height})`);
			break;

		case WasmErrorType.VALIDATION:
			// Keep original validation message
			break;

		default:
			// Keep original message
			break;
	}

	if (suggestions.length > 0) {
		message += `\n\nTry: ${suggestions.join(', ')}.`;
	}

	return message;
}
