<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { ConvertedAsciiFrame } from '$lib/ascii/converter';
	import { renderToCanvas } from '$lib/ascii/canvas-renderer';
	import type { WasmError } from '$lib/ascii/error-types';
	import { createErrorMessage } from '$lib/ascii/error-types';

	type DownloadType = 'txt' | 'svg' | 'png' | 'webp' | 'gif' | 'apng';

	interface Props {
		isProcessing?: boolean;
		asciiOutput?: string;
		isAnimatedImage?: boolean;
		asciiFrames?: ConvertedAsciiFrame[];
		useCanvasRenderer?: boolean;
		isExporting?: boolean;
		exportProgress?: number;
		exportType?: 'gif' | 'apng' | null;
		wasmErrors?: WasmError[];
		ondownload?: (e: { type: DownloadType }) => void;
		onexport?: () => void;
		ondismissError?: (index: number) => void;
		oncancel?: () => void;
	}

	let {
		isProcessing = false,
		asciiOutput = '',
		isAnimatedImage = false,
		asciiFrames = [],
		useCanvasRenderer = false,
		isExporting = false,
		exportProgress = 0,
		exportType = null,
		wasmErrors = [],
		ondownload,
		onexport,
		ondismissError,
		oncancel
	}: Props = $props();

	let menuOpen = $state(false);
	let dropdownRef = $state<HTMLDivElement | null>(null);
	let triggerRef = $state<HTMLButtonElement | null>(null);
	let currentFrameIndex = $state(0);
	let animationFrameId: number | null = null;
	let lastFrameTime = 0;
	let isAnimating = $state(false);
	let canvasRef = $state<HTMLCanvasElement | null>(null);

	let loadingMessageIndex = $state(0);
	let loadingMessageInterval: number | null = null;
	const loadingMessages = [
		'This may take a moment for large files',
		'[Single Threaded Rendering]',
		"Hmmmm it's taking too much",
		"Almost there, it's not my fault",
		'Huh, at this point use APNG instead',
		'Your CPU is too slow jk',
		'Your patience is truly outstanding...',
		'You still here?'
	];

	// Rotate loading messages every 5 seconds during export
	$effect(() => {
		if (isExporting) {
			loadingMessageIndex = 0;
			loadingMessageInterval = window.setInterval(() => {
				loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
			}, 5000);

			return () => {
				if (loadingMessageInterval !== null) {
					clearInterval(loadingMessageInterval);
					loadingMessageInterval = null;
				}
			};
		} else {
			if (loadingMessageInterval !== null) {
				clearInterval(loadingMessageInterval);
				loadingMessageInterval = null;
			}
			loadingMessageIndex = 0;
		}
	});

	function playAnimation(timestamp: number) {
		if (asciiFrames.length <= 1 || isProcessing || !isAnimating || isExporting) {
			animationFrameId = null;
			return;
		}

		const currentFrame = asciiFrames[currentFrameIndex];
		const frameDelay = currentFrame?.delay ?? 100;

		if (timestamp - lastFrameTime >= frameDelay) {
			currentFrameIndex = (currentFrameIndex + 1) % asciiFrames.length;
			lastFrameTime = timestamp;
		}

		animationFrameId = requestAnimationFrame(playAnimation);
	}

	function startAnimation() {
		if (asciiFrames.length <= 1 || isProcessing) return;
		isAnimating = true;
		lastFrameTime = performance.now();
		animationFrameId = requestAnimationFrame(playAnimation);
	}

	function stopAnimation() {
		isAnimating = false;
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	$effect(() => {
		stopAnimation();
		currentFrameIndex = 0;

		if (asciiFrames.length > 1 && !isProcessing && !isExporting) {
			startAnimation();
		}

		return () => {
			stopAnimation();
		};
	});

	$effect(() => {
		const hasOutput = Boolean(asciiOutput);
		const processing = isProcessing;
		if (!hasOutput || processing) {
			menuOpen = false;
		}
	});

	onDestroy(() => {
		stopAnimation();
	});
	const displayedAscii = $derived.by(() => {
		if (asciiFrames.length > 0) {
			return asciiFrames[currentFrameIndex]?.ascii ?? '';
		}
		return asciiOutput;
	});
	// Track if we're on the client to avoid hydration mismatch
	let isMounted = $state(false);

	onMount(() => {
		isMounted = true;
	});

	// Reusable canvas for rendering
	let reusableCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;

	// Render to canvas when in canvas mode (client-side only)
	$effect(() => {
		if (isMounted && useCanvasRenderer && displayedAscii && canvasRef) {
			const fontSize = 10;
			const fontFamily = "'Inconsolata', monospace";

			// Initialize reusable canvas if needed
			if (!reusableCanvas) {
				if (typeof OffscreenCanvas !== 'undefined') {
					reusableCanvas = new OffscreenCanvas(100, 100);
				} else {
					reusableCanvas = document.createElement('canvas');
				}
			}

			const rendered = renderToCanvas(displayedAscii, {
				fontSize,
				fontFamily,
				backgroundColor: '#141414',
				transparentBackground: false,
				reuseCanvas: reusableCanvas
			});

			if (rendered) {
				const ctx = canvasRef.getContext('2d', { willReadFrequently: true });
				if (ctx) {
					canvasRef.width = rendered.width;
					canvasRef.height = rendered.height;
					ctx.clearRect(0, 0, rendered.width, rendered.height);
					if (rendered.canvas instanceof HTMLCanvasElement) {
						ctx.drawImage(rendered.canvas, 0, 0);
					} else if (rendered.canvas instanceof OffscreenCanvas) {
						// Transfer from OffscreenCanvas
						const bitmap = rendered.canvas.transferToImageBitmap();
						ctx.drawImage(bitmap, 0, 0);
						bitmap.close();
					}
				}
			}
		}
	});

	const closeMenu = () => {
		menuOpen = false;
	};

	function toggleMenu() {
		if (!asciiOutput || isProcessing) return;
		menuOpen = !menuOpen;
	}

	function handleSelect(type: DownloadType) {
		if (!asciiOutput || isProcessing) return;
		ondownload?.({ type });
		closeMenu();
	}

	function handleWindowClick(event: MouseEvent) {
		if (!menuOpen) return;
		const target = event.target as Node;
		if (dropdownRef?.contains(target) || triggerRef?.contains(target)) return;
		closeMenu();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeMenu();
		}
	}

	function handleExport() {
		if (!asciiFrames.length || isProcessing) return;
		onexport?.();
	}

	function handleCancel() {
		oncancel?.();
	}

	function getAsciiProgressBar(percentage: number, width = 20): string {
		const filled = Math.round((percentage / 100) * width);
		const empty = width - filled;
		return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
	}
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleKeydown} />

<section class="output-panel" class:processing={isProcessing}>
	{#if wasmErrors && wasmErrors.length > 0}
		<div class="error-banners">
			{#each wasmErrors as error, index (error.timestamp)}
				<div class="error-banner" role="alert" transition:slide={{ duration: 200 }}>
					<div class="error-header">
						<span class="error-icon">⚠</span>
						<span class="error-type">WASM Runtime Error</span>
						<button
							class="error-dismiss"
							onclick={() => ondismissError?.(index)}
							aria-label="Dismiss error"
						>
							×
						</button>
					</div>
					<div class="error-body">
						<p class="error-message">{createErrorMessage(error)}</p>
						{#if error.context}
							<div class="error-context">
								<strong>Settings:</strong>
								{#if error.context.frameCount}
									<span>{error.context.frameCount} frames</span>
								{/if}
								{#if error.context.width && error.context.height}
									<span>{error.context.width}×{error.context.height}px</span>
								{/if}
								{#if error.context.quality}
									<span>quality {error.context.quality}</span>
								{/if}
								{#if error.context.estimatedMemoryMB}
									<span>~{error.context.estimatedMemoryMB.toFixed(0)}MB</span>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
	{#if asciiOutput && !isProcessing}
		<div class="action-buttons">
			{#if isAnimatedImage && asciiFrames.length > 0}
				<button
					type="button"
					class="export-button"
					onclick={handleExport}
					aria-label="Export animation"
					title="Export animation as JSON"
				>
					<span class="export-icon" aria-hidden="true">⭱</span>
				</button>
			{/if}
			<div class="download-dropdown" aria-live="polite">
				<button
					type="button"
					class="download-trigger"
					onclick={toggleMenu}
					aria-label="Download ASCII output"
					title="Download ASCII output"
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					bind:this={triggerRef}
				>
					<span class="download-icon" aria-hidden="true">⭳</span>
				</button>
				{#if menuOpen}
					<div class="dropdown-menu" bind:this={dropdownRef} role="menu">
						<button type="button" role="menuitem" onclick={() => handleSelect('txt')}>
							Download TXT
						</button>
						<button type="button" role="menuitem" onclick={() => handleSelect('svg')}>
							Download SVG
						</button>
						<button type="button" role="menuitem" onclick={() => handleSelect('png')}>
							Download PNG
						</button>
						<button type="button" role="menuitem" onclick={() => handleSelect('webp')}>
							Download WebP
						</button>
						{#if isAnimatedImage && asciiFrames.length > 0}
							<button type="button" role="menuitem" onclick={() => handleSelect('gif')}>
								Download GIF
							</button>
							<button type="button" role="menuitem" onclick={() => handleSelect('apng')}>
								Download APNG
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="output-body" aria-busy={isProcessing}>
		{#if asciiOutput}
			<div class="output-wrapper">
				{#if isMounted && useCanvasRenderer}
					<canvas bind:this={canvasRef} class="ascii-canvas"></canvas>
				{:else}
					<!-- eslint-disable svelte/no-at-html-tags -->
					<pre id="ascii-output" class="ascii-output">{@html displayedAscii}</pre>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<p>Upload an image/sequence to get started <br /> (Drag and drop supported)</p>
			</div>
		{/if}
	</div>

	{#if isProcessing}
		<div class="processing-overlay" role="status" aria-live="polite">
			<div class="processing-card">
				<div class="processing-spinner" aria-hidden="true">
					<span class="orbit-char char-1">@</span>
					<span class="orbit-char char-2">#</span>
					<span class="orbit-char char-3">%</span>
					<span class="orbit-char char-4">.</span>
					<span class="center-char">*</span>
				</div>
				<p>{isAnimatedImage ? 'Preparing animation…' : 'Processing image…'}</p>
			</div>
		</div>
	{/if}

	{#if isExporting}
		<div class="processing-overlay" role="status" aria-live="polite">
			<div class="processing-card">
				<div class="ascii-progress">
					{getAsciiProgressBar(exportProgress)}
				</div>
				<p class="progress-text">
					{exportType === 'apng' ? 'Encoding APNG' : 'Exporting GIF'}… {Math.round(exportProgress)}%
				</p>
				<small style="color: var(--output-text-secondary); margin-top: 0.5rem;">
					{loadingMessages[loadingMessageIndex]}
				</small>
				<button
					type="button"
					class="cancel-button"
					onclick={handleCancel}
					aria-label="Cancel export"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</section>

<style>
	.output-panel {
		--output-bg-primary: var(--gray-950);
		--output-bg-secondary: #141414;
		--output-bg-tertiary: var(--gray-800);
		--output-text-primary: var(--gray-50);
		--output-text-secondary: var(--gray-300);
		--output-border-color: var(--gray-700);

		background: var(--output-bg-secondary);
		border: 1px solid var(--output-border-color);
		padding: 1rem;
		min-height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow-x: hidden;
		overflow-y: auto;
	}

	@media (min-width: 768px) {
		.output-panel {
			padding: 2rem;
			min-height: 400px;
		}
	}

	.output-panel.processing {
		overflow: hidden;
	}

	.output-body {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.output-wrapper {
		width: 100%;
		max-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.output-panel.processing .output-wrapper {
		filter: blur(2px);
		opacity: 0.4;
		pointer-events: none;
	}

	/* .animated-preview {
		position: relative;
		max-width: 300px;
		border: 1px solid var(--output-border-color);
		padding: 0.5rem;
		background: var(--output-bg-tertiary);
	}

	.preview-image {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.animation-badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid rgba(255, 255, 255, 0.3);
	} */

	.ascii-output {
		font-family: 'Inconsolata', monospace;
		font-size: 8px;
		line-height: 1;
		white-space: pre;
		overflow-x: auto;
		overflow-y: auto;
		margin: 0;
		font-weight: 400;
		max-width: 100%;
		scrollbar-width: thin;
		scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
	}

	@media (min-width: 768px) {
		.ascii-output {
			font-size: 10px;
		}
	}

	.output-panel.processing .ascii-output {
		overflow: hidden;
	}

	.ascii-output::-webkit-scrollbar {
		width: 0.5rem;
		height: 0.5rem;
	}

	@media (min-width: 768px) {
		.ascii-output::-webkit-scrollbar {
			width: 0.65rem;
			height: 0.65rem;
		}
	}

	.ascii-output::-webkit-scrollbar-track {
		background: var(--output-bg-tertiary);
	}

	.ascii-output::-webkit-scrollbar-thumb {
		background: var(--output-text-secondary);
		border: 2px solid var(--output-bg-tertiary);
	}

	.ascii-output::-webkit-scrollbar-thumb:hover {
		background: var(--output-text-primary);
	}

	.ascii-output::-webkit-scrollbar-corner {
		background: var(--output-bg-tertiary);
	}

	.ascii-canvas {
		max-width: 100%;
		height: auto;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.empty-state {
		text-align: center;
		color: var(--output-text-secondary);
		font-size: 0.9375rem;
		padding: 1rem;
	}

	@media (min-width: 768px) {
		.empty-state {
			font-size: 1rem;
		}
	}

	.action-buttons {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		z-index: 10;
	}

	@media (min-width: 768px) {
		.action-buttons {
			top: 1rem;
			right: 1rem;
		}
	}

	.download-dropdown {
		position: relative;
	}

	.export-button,
	.download-trigger {
		background: var(--output-bg-secondary);
		border: 1px solid var(--output-border-color);
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		font-size: 1.25rem;
		line-height: 1.25rem;
		height: 2.75rem;
		min-height: 44px; /* Touch target */
		min-width: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		color: var(--output-text-primary);
		-webkit-tap-highlight-color: transparent;
	}

	@media (min-width: 768px) {
		.export-button,
		.download-trigger {
			padding: 0.5rem 1rem;
			height: 2.5rem;
			min-width: 3.5rem;
		}
	}

	.export-button:hover,
	.export-button:focus-visible,
	.download-trigger:hover,
	.download-trigger:focus-visible {
		background: var(--output-bg-tertiary);
		transform: translateY(-1px);
		border-color: var(--gray-500);
	}

	@media (hover: none) {
		.export-button:hover,
		.download-trigger:hover {
			transform: none;
		}

		.export-button:active,
		.download-trigger:active {
			transform: scale(0.98);
			background: var(--output-bg-tertiary);
		}
	}

	.export-icon,
	.download-icon {
		font-size: 1.1rem;
		line-height: 1;
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		background: var(--output-bg-secondary);
		border: 1px solid var(--output-border-color);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
		padding: 0.35rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 160px;
		z-index: 100;
	}

	.dropdown-menu button {
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: 0.5rem 0.75rem;
		color: var(--output-text-primary);
		font-family: 'Inconsolata', monospace;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.2s ease;
		white-space: nowrap;
	}

	.dropdown-menu button:hover {
		background: var(--output-bg-tertiary);
	}

	.ascii-progress {
		font-family: 'Inconsolata', monospace;
		font-size: 1.2rem;
		color: var(--output-text-primary);
		font-weight: 700;
		margin-bottom: 1rem;
		white-space: pre;
	}

	.progress-text {
		font-family: 'Inconsolata', monospace;
		font-size: 1rem;
		color: var(--output-text-primary);
		font-weight: 500;
	}

	.dropdown-menu button:hover,
	.dropdown-menu button:focus-visible {
		background: var(--output-bg-tertiary);
	}

	@media (hover: none) {
		.dropdown-menu button:hover {
			background: transparent;
		}

		.dropdown-menu button:active {
			background: var(--output-bg-tertiary);
		}
	}

	.processing-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(3px);
		z-index: 20;
	}

	.processing-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		background: rgba(20, 20, 20, 0.85);
		border: 1px solid var(--output-border-color);
		padding: 1rem 1.5rem;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
		max-width: 90%;
	}

	.processing-card p {
		margin: 0;
		color: var(--output-text-primary);
		font-size: 0.9375rem;
	}

	@media (min-width: 768px) {
		.processing-card p {
			font-size: 1rem;
		}
	}

	.processing-spinner {
		width: 5rem;
		height: 5rem;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Inconsolata', monospace;
		font-weight: 700;
		color: var(--output-text-primary);
	}

	.orbit-char {
		position: absolute;
		font-size: 1.5rem;
		animation: orbit 3s linear infinite;
		transform-origin: center;
	}

	.char-1 {
		font-size: 1.8rem;
		animation: orbit-1 2.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
		opacity: 0.9;
	}

	.char-2 {
		font-size: 1.5rem;
		animation: orbit-2 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
		opacity: 0.8;
	}

	.char-3 {
		font-size: 1.2rem;
		animation: orbit-3 3.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
		opacity: 0.7;
	}

	.char-4 {
		font-size: 1rem;
		animation: orbit-4 4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
		opacity: 0.6;
	}

	.center-char {
		position: relative;
		font-size: 1.5rem;
		animation:
			morph-char 2s ease-in-out infinite,
			pulse-scale 2s ease-in-out infinite;
		z-index: 1;
	}

	@keyframes orbit-1 {
		0% {
			transform: rotate(0deg) translateX(2rem) rotate(0deg);
		}
		100% {
			transform: rotate(360deg) translateX(2rem) rotate(-360deg);
		}
	}

	@keyframes orbit-2 {
		0% {
			transform: rotate(90deg) translateX(1.7rem) rotate(-90deg);
		}
		100% {
			transform: rotate(450deg) translateX(1.7rem) rotate(-450deg);
		}
	}

	@keyframes orbit-3 {
		0% {
			transform: rotate(180deg) translateX(1.4rem) rotate(-180deg);
		}
		100% {
			transform: rotate(540deg) translateX(1.4rem) rotate(-540deg);
		}
	}

	@keyframes orbit-4 {
		0% {
			transform: rotate(270deg) translateX(1.1rem) rotate(-270deg);
		}
		100% {
			transform: rotate(630deg) translateX(1.1rem) rotate(-630deg);
		}
	}

	@keyframes morph-char {
		0% {
			content: '█';
			opacity: 1;
		}
		14% {
			content: '▓';
			opacity: 0.9;
		}
		28% {
			content: '▒';
			opacity: 0.8;
		}
		42% {
			content: '░';
			opacity: 0.7;
		}
		56% {
			content: '●';
			opacity: 0.8;
		}
		70% {
			content: '○';
			opacity: 0.9;
		}
		84% {
			content: '·';
			opacity: 1;
		}
		100% {
			content: '█';
			opacity: 1;
		}
	}

	@keyframes pulse-scale {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.3);
		}
	}

	/* Error banners */
	.error-banners {
		position: absolute;
		top: 1rem;
		left: 1rem;
		right: 1rem;
		z-index: 30;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: 50vh;
		overflow-y: auto;
	}

	.error-banner {
		background: rgba(220, 38, 38, 0.1);
		border: 2px solid rgb(220, 38, 38);
		border-radius: 4px;
		padding: 1rem;
		box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
	}

	.error-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.error-icon {
		font-size: 1.25rem;
		color: rgb(220, 38, 38);
	}

	.error-type {
		font-family: 'Inconsolata', monospace;
		font-weight: 700;
		color: rgb(220, 38, 38);
		font-size: 0.875rem;
		flex: 1;
	}

	.error-dismiss {
		background: none;
		border: none;
		color: var(--output-text-secondary);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
	}

	.error-dismiss:hover {
		color: var(--output-text-primary);
	}

	.error-body {
		color: var(--output-text-primary);
	}

	.error-message {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.error-context {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--output-text-secondary);
		font-family: 'Inconsolata', monospace;
	}

	.error-context strong {
		color: var(--output-text-primary);
		margin-right: 0.25rem;
	}

	.error-context span {
		background: var(--output-bg-tertiary);
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
	}

	.cancel-button {
		margin-top: 1rem;
		padding: 0.5rem 1.5rem;
		background: var(--output-bg-tertiary);
		border: 1px solid var(--output-border-color);
		color: var(--output-text-primary);
		font-family: 'Inconsolata', monospace;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 44px; /* Touch target */
	}

	.cancel-button:hover,
	.cancel-button:focus-visible {
		background: var(--output-bg-primary);
		border-color: var(--gray-500);
		transform: translateY(-1px);
	}

	@media (hover: none) {
		.cancel-button:hover {
			transform: none;
		}

		.cancel-button:active {
			transform: scale(0.98);
			background: var(--output-bg-primary);
		}
	}
</style>
