import type { ConvertedAsciiFrame } from './converter';
import type { AsciiControlValues } from './types';
import type { AnimationInfo } from './animation';
import type { WasmError } from './error-types';

/**
 * Message types for worker communication
 */
export enum WorkerMessageType {
	// Requests from main thread to worker
	CONVERT_IMAGE = 'CONVERT_IMAGE',
	CONVERT_ANIMATION = 'CONVERT_ANIMATION',
	EXPORT_GIF = 'EXPORT_GIF',
	EXPORT_APNG = 'EXPORT_APNG',
	CANCEL = 'CANCEL',

	// Responses from worker to main thread
	CONVERSION_COMPLETE = 'CONVERSION_COMPLETE',
	CONVERSION_ERROR = 'CONVERSION_ERROR',
	CONVERSION_PROGRESS = 'CONVERSION_PROGRESS',
	WASM_ERROR = 'WASM_ERROR'
}

/**
 * Base message structure
 */
export interface WorkerMessage {
	type: WorkerMessageType;
	id: string; // Unique request ID for matching responses
}

/**
 * Request to convert a single image to ASCII
 */
export interface ConvertImageRequest extends WorkerMessage {
	type: WorkerMessageType.CONVERT_IMAGE;
	payload: {
		imageData: ImageData;
		controls: AsciiControlValues & {
			spaceDensity: number;
		};
	};
}

/**
 * Request to convert an animation to ASCII frames
 */
export interface ConvertAnimationRequest extends WorkerMessage {
	type: WorkerMessageType.CONVERT_ANIMATION;
	payload: {
		animationInfo: AnimationInfo;
		controls: AsciiControlValues & {
			spaceDensity: number;
			animationFrameLimit: number;
			animationFrameSkip: number;
			animationPlaybackSpeed: number;
		};
	};
}

/**
 * Request to export GIF
 */
export interface ExportGifRequest extends WorkerMessage {
	type: WorkerMessageType.EXPORT_GIF;
	payload: {
		frames: ArrayBuffer[];
		delays: number[];
		width: number;
		height: number;
		repeat: number;
		quality: number;
		transparent: boolean;
	};
}

/**
 * Request to export APNG
 */
export interface ExportApngRequest extends WorkerMessage {
	type: WorkerMessageType.EXPORT_APNG;
	payload: {
		frames: ArrayBuffer[];
		delays: number[];
		width: number;
		height: number;
		repeat: number;
		quality?: number;
	};
}

/**
 * Request to cancel ongoing conversion
 */
export interface CancelRequest extends WorkerMessage {
	type: WorkerMessageType.CANCEL;
}

/**
 * Union type for all request messages
 */
export type WorkerRequest =
	| ConvertImageRequest
	| ConvertAnimationRequest
	| ExportGifRequest
	| ExportApngRequest
	| CancelRequest;

/**
 * Response for successful image conversion
 */
export interface ConversionCompleteResponse extends WorkerMessage {
	type: WorkerMessageType.CONVERSION_COMPLETE;
	payload: {
		asciiOutput?: string;
		asciiFrames?: ConvertedAsciiFrame[];
		blob?: Blob;
	};
}

/**
 * Response for conversion error
 */
export interface ConversionErrorResponse extends WorkerMessage {
	type: WorkerMessageType.CONVERSION_ERROR;
	payload: {
		error: string;
		wasmError?: WasmError; // Structured error with context
	};
}

/**
 * Response for WASM runtime errors
 */
export interface WasmErrorResponse extends WorkerMessage {
	type: WorkerMessageType.WASM_ERROR;
	payload: {
		wasmError: WasmError;
	};
}

/**
 * Progress update during conversion
 */
export interface ConversionProgressResponse extends WorkerMessage {
	type: WorkerMessageType.CONVERSION_PROGRESS;
	payload: {
		progress: number; // 0-100
		currentFrame?: number;
		totalFrames?: number;
	};
}

/**
 * Union type for all response messages
 */
export type WorkerResponse =
	| ConversionCompleteResponse
	| ConversionErrorResponse
	| ConversionProgressResponse
	| WasmErrorResponse;

/**
 * Type guard for worker responses
 */
export function isWorkerResponse(message: unknown): message is WorkerResponse {
	return (
		typeof message === 'object' &&
		message !== null &&
		'type' in message &&
		'id' in message &&
		typeof (message as WorkerMessage).type === 'string' &&
		typeof (message as WorkerMessage).id === 'string'
	);
}

/**
 * Configuration for worker manager
 */
export interface WorkerConfig {
	maxRetries?: number;
	timeout?: number; // milliseconds
	enableProgress?: boolean;
}

/**
 * Conversion options for worker
 */
export interface WorkerConversionOptions {
	onProgress?: (progress: number, currentFrame?: number, totalFrames?: number) => void;
	onError?: (error: WasmError) => void;
	signal?: AbortSignal;
	transfer?: Transferable[];
}
