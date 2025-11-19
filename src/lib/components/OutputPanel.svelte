<script lang="ts">
import { createEventDispatcher, onDestroy } from 'svelte';
import type { ConvertedAsciiFrame } from '$lib/ascii/converter';

	type DownloadType = 'txt' | 'svg' | 'png' | 'webp' | 'gif' | 'apng';

	interface Props {
		isProcessing?: boolean;
		asciiOutput?: string;
		isAnimatedImage?: boolean;
		imageUrl?: string;
		asciiFrames?: ConvertedAsciiFrame[];
	}

let {
	isProcessing = false,
	asciiOutput = '',
	isAnimatedImage = false,
	imageUrl = '',
	asciiFrames = []
}: Props = $props();

	const dispatch = createEventDispatcher<{ download: { type: DownloadType }, export: void }>();

	let menuOpen = $state(false);
	let dropdownRef = $state<HTMLDivElement | null>(null);
	let triggerRef = $state<HTMLButtonElement | null>(null);
	let currentFrameIndex = $state(0);
	let animationFrameId: number | null = null;
	let lastFrameTime = 0;
	let isAnimating = $state(false);

	function playAnimation(timestamp: number) {
		if (asciiFrames.length <= 1 || isProcessing || !isAnimating) {
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

		if (asciiFrames.length > 1 && !isProcessing) {
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

	const closeMenu = () => {
		menuOpen = false;
	};

	function toggleMenu() {
		if (!asciiOutput || isProcessing) return;
		menuOpen = !menuOpen;
	}

	function handleSelect(type: DownloadType) {
		if (!asciiOutput || isProcessing) return;
		dispatch('download', { type });
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
		dispatch('export');
	}
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleKeydown} />

<section class="output-panel" class:processing={isProcessing}>
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
				<pre id="ascii-output" class="ascii-output">{@html displayedAscii}</pre>
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
				<span class="processing-spinner" aria-hidden="true"></span>
				<p>{isAnimatedImage ? 'Preparing animation…' : 'Processing image…'}</p>
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
		padding: 2rem;
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow-x: hidden;
		overflow-y: auto;
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
		font-size: 10px;
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

	.output-panel.processing .ascii-output {
		overflow: hidden;
	}

	.ascii-output::-webkit-scrollbar {
		width: 0.65rem;
		height: 0.65rem;
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

	.empty-state {
		text-align: center;
		color: var(--output-text-secondary);
	}

	.action-buttons {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		z-index: 10;
	}

	.download-dropdown {
		position: relative;
	}

	.export-button,
	.download-trigger {
        background: var(--output-bg-secondary);
        border: 1px solid var(--output-border-color);
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 1.25rem;
        line-height: 1.25rem;
        height: 2.5rem;
        min-width: 3.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: var(--output-text-primary);
	}

	.export-button:hover,
	.export-button:focus-visible,
	.download-trigger:hover,
	.download-trigger:focus-visible {
		background: var(--output-bg-tertiary);
		transform: translateY(-1px);
        border-color: var(--gray-500);
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
		background: transparent;
		border: none;
		text-align: left;
		padding: 0.5rem 0.75rem;
		color: var(--output-text-primary);
		font-family: 'Inconsolata', monospace;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.dropdown-menu button:hover,
	.dropdown-menu button:focus-visible {
		background: var(--output-bg-tertiary);
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
	}

	.processing-card p {
		margin: 0;
		color: var(--output-text-primary);
		font-size: 1rem;
	}

	.processing-spinner {
		width: 2rem;
		height: 2rem;
		border-radius: 0;
		border: 3px solid rgba(255, 255, 255, 0.15);
		border-top-color: var(--output-text-primary);
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
