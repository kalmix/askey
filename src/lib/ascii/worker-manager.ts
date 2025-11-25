import type { ConvertedAsciiFrame } from './converter';
import type { AsciiControlValues } from './types';
import type { AnimationInfo } from './animation';
import {
	WorkerMessageType,
	type WorkerRequest,
	type WorkerResponse,
	type WorkerConfig,
	type WorkerConversionOptions,
	isWorkerResponse
} from './worker-types';
import AsciiWorker from './ascii-worker?worker';

/**
 * Manager for ASCII conversion worker
 * Handles worker lifecycle, message passing, and fallback to main thread
 */
export class WorkerManager {
	private worker: Worker | null = null;
	private requestId = 0;
	private pendingRequests = new Map<
		string,
		{
			resolve: (value: {
				asciiOutput?: string;
				asciiFrames?: ConvertedAsciiFrame[];
				blob?: Blob;
			}) => void;
			reject: (error: Error) => void;
			onProgress?: (progress: number, currentFrame?: number, totalFrames?: number) => void;
			onError?: (error: import('./error-types').WasmError) => void;
			timeout?: number;
		}
	>();
	private config: Required<WorkerConfig>;
	private isInitialized = false;
	private initializationError: Error | null = null;

	constructor(config: WorkerConfig = {}) {
		this.config = {
			maxRetries: config.maxRetries ?? 3,
			timeout: config.timeout ?? 300000, // 300 seconds (5 minutes) for debugging
			enableProgress: config.enableProgress ?? true
		};
	}

	/**
	 * Init the worker
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;
		if (this.initializationError) throw this.initializationError;

		try {
			// Check if Worker is supported
			if (typeof Worker === 'undefined') {
				throw new Error('Web Workers are not supported in this environment');
			}

			// Create worker instance
			this.worker = new AsciiWorker();

			// Set up message handler
			this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));

			// Set up error handler
			this.worker.addEventListener('error', this.handleWorkerError.bind(this));

			this.isInitialized = true;
		} catch (error) {
			this.initializationError =
				error instanceof Error ? error : new Error('Failed to initialize worker');
			throw this.initializationError;
		}
	}

	async convertImage(
		imageData: ImageData,
		controls: AsciiControlValues & { spaceDensity: number },
		options: WorkerConversionOptions = {}
	): Promise<string> {
		await this.initialize();

		const id = this.generateRequestId();
		const request: WorkerRequest = {
			type: WorkerMessageType.CONVERT_IMAGE,
			id,
			payload: {
				imageData,
				controls
			}
		};

		const result = await this.sendRequest(request, options);
		return result.asciiOutput ?? '';
	}

	async convertAnimation(
		animationInfo: AnimationInfo,
		controls: AsciiControlValues & {
			spaceDensity: number;
			animationFrameLimit: number;
			animationFrameSkip: number;
			animationPlaybackSpeed: number;
		},
		options: WorkerConversionOptions = {}
	): Promise<ConvertedAsciiFrame[]> {
		await this.initialize();

		const id = this.generateRequestId();
		const request: WorkerRequest = {
			type: WorkerMessageType.CONVERT_ANIMATION,
			id,
			payload: {
				animationInfo,
				controls
			}
		};

		const result = await this.sendRequest(request, options);
		return result.asciiFrames ?? [];
	}

	async exportGif(
		payload: {
			frames: ArrayBuffer[];
			delays: number[];
			width: number;
			height: number;
			repeat: number;
			quality: number; // !TODO: Add quality options in the UI
			transparent: boolean;
		},
		options: WorkerConversionOptions = {}
	): Promise<Blob> {
		await this.initialize();

		const id = this.generateRequestId();
		const request: WorkerRequest = {
			type: WorkerMessageType.EXPORT_GIF,
			id,
			payload
		};

		const result = await this.sendRequest(request, {
			...options,
			transfer: payload.frames // Transfer the ArrayBuffers
		});
		if (!result.blob) throw new Error('No blob returned from worker');
		return result.blob;
	}

	async exportApng(
		payload: {
			frames: ArrayBuffer[];
			delays: number[];
			width: number;
			height: number;
			repeat: number;
			quality?: number; // !TODO: Add quality options in the UI
		},
		options: WorkerConversionOptions = {}
	): Promise<Blob> {
		await this.initialize();

		const id = this.generateRequestId();
		const request: WorkerRequest = {
			type: WorkerMessageType.EXPORT_APNG,
			id,
			payload
		};

		const result = await this.sendRequest(request, {
			...options,
			transfer: payload.frames // Transfer the ArrayBuffers
		});
		if (!result.blob) throw new Error('No blob returned from worker');
		return result.blob;
	}

	/**
	 * Cancel ongoing conversion
	 */
	cancelConversion(requestId?: string): void {
		if (!this.worker) return;

		if (requestId) {
			// Cancel specific request
			const pending = this.pendingRequests.get(requestId);
			if (pending) {
				clearTimeout(pending.timeout);
				this.pendingRequests.delete(requestId);
				pending.reject(new Error('Conversion cancelled'));
			}
		} else {
			// Cancel all requests
			const cancelMessage: WorkerRequest = {
				type: WorkerMessageType.CANCEL,
				id: this.generateRequestId()
			};
			this.worker.postMessage(cancelMessage);

			// Reject all pending requests
			this.pendingRequests.forEach((pending) => {
				clearTimeout(pending.timeout);
				pending.reject(new Error('Conversion cancelled'));
			});
			this.pendingRequests.clear();
		}
	}

	/**
	 * Terminate the worker
	 */
	terminate(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// Reject all pending requests
		this.pendingRequests.forEach((pending) => {
			clearTimeout(pending.timeout);
			pending.reject(new Error('Worker terminated'));
		});
		this.pendingRequests.clear();

		this.isInitialized = false;
		this.initializationError = null;
	}

	/**
	 * Check if worker is available
	 */
	isAvailable(): boolean {
		return this.isInitialized && this.worker !== null;
	}

	private async sendRequest(
		request: WorkerRequest,
		options: WorkerConversionOptions
	): Promise<{ asciiOutput?: string; asciiFrames?: ConvertedAsciiFrame[]; blob?: Blob }> {
		if (!this.worker) {
			throw new Error('Worker not initialized');
		}

		return new Promise((resolve, reject) => {
			const timeoutId = window.setTimeout(() => {
				this.pendingRequests.delete(request.id);
				reject(new Error('Conversion timeout'));
			}, this.config.timeout);

			this.pendingRequests.set(request.id, {
				resolve,
				reject,
				onProgress: options.onProgress,
				onError: options.onError,
				timeout: timeoutId
			});

			// Handle abort signal
			if (options.signal) {
				options.signal.addEventListener('abort', () => {
					this.cancelConversion(request.id);
				});
			}

			// Send request to worker
			if (options.transfer) {
				this.worker!.postMessage(request, options.transfer);
			} else {
				this.worker!.postMessage(request);
			}
		});
	}

	private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
		const message = event.data;

		if (!isWorkerResponse(message)) {
			console.warn('Received invalid message from worker:', message);
			return;
		}

		const pending = this.pendingRequests.get(message.id);
		if (!pending) {
			return;
		}

		switch (message.type) {
			case WorkerMessageType.CONVERSION_COMPLETE:
				clearTimeout(pending.timeout);
				this.pendingRequests.delete(message.id);
				pending.resolve(message.payload);
				break;

			case WorkerMessageType.CONVERSION_ERROR:
				clearTimeout(pending.timeout);
				this.pendingRequests.delete(message.id);
				pending.reject(new Error(message.payload.error));
				break;

			case WorkerMessageType.CONVERSION_PROGRESS:
				if (pending.onProgress) {
					pending.onProgress(
						message.payload.progress,
						message.payload.currentFrame,
						message.payload.totalFrames
					);
				}
				break;

			case WorkerMessageType.WASM_ERROR:
				// Forward WASM error to onError callback if provided
				if (pending.onError) {
					pending.onError(message.payload.wasmError);
				}
				// Don't clear pending request - let CONVERSION_ERROR handle that
				break;

			default:
				console.warn('Unknown message type from worker:', message);
		}
	}

	/**
	 * Handle worker errors
	 */
	private handleWorkerError(error: ErrorEvent): void {
		console.error('Worker error event received:', error);
		console.error('Worker error details:', {
			message: error.message,
			filename: error.filename,
			lineno: error.lineno,
			colno: error.colno,
			error: error.error,
			stack: error.error?.stack
		});

		const errorMsg =
			error.message || error.error?.message || error.error?.toString() || 'Unknown worker error';

		const fullError = error.filename
			? `${errorMsg} at ${error.filename}:${error.lineno}:${error.colno}`
			: errorMsg;

		this.pendingRequests.forEach((pending) => {
			clearTimeout(pending.timeout);
			pending.reject(new Error(`Worker error: ${fullError}`));
		});
		this.pendingRequests.clear();

		this.initializationError = new Error(`Worker error: ${fullError}`);
		this.isInitialized = false;
	}

	private generateRequestId(): string {
		return `req_${++this.requestId}_${Date.now()}`;
	}
}

let workerManagerInstance: WorkerManager | null = null;

export function getWorkerManager(): WorkerManager {
	if (!workerManagerInstance) {
		workerManagerInstance = new WorkerManager();
	}
	return workerManagerInstance;
}

export function terminateWorkerManager(): void {
	if (workerManagerInstance) {
		workerManagerInstance.terminate();
		workerManagerInstance = null;
	}
}
