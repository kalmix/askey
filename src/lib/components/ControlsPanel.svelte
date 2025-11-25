<script lang="ts">
	import { type Snippet } from 'svelte';

	import {
		ASCII_GRADIENTS,
		// DITHERING_METHODS,
		RENDER_MODE_OPTIONS,
		// type DitheringName,
		type GradientName
	} from '$lib/ascii/constants';

	import ControlSection from './ControlSection.svelte';
	import SelectControl from './SelectControl.svelte';
	import SliderControl from './SliderControl.svelte';

	let {
		hasImage = false,
		hasError = false,
		selectedFileName = '',
		dragActive = false,
		characters = $bindable(),
		brightness = $bindable(),
		contrast = $bindable(),
		saturation = $bindable(),
		hue = $bindable(),
		grayscale = $bindable(),
		sepia = $bindable(),
		invertColors = $bindable(),
		thresholding = $bindable(),
		sharpness = $bindable(),
		edgeDetection = $bindable(),
		selectedGradient = $bindable(),
		useCanvasRenderer = $bindable(true),
		hasAdjustments = false,
		isAnimatedImage = false,
		animationFrameLimit = $bindable(),
		animationFrameSkip = $bindable(),
		animationPlaybackSpeed = $bindable(),
		actions,
		onfileselect,
		onreset
	} = $props<{
		hasImage?: boolean;
		hasError?: boolean;
		selectedFileName?: string;
		dragActive?: boolean;
		characters?: number;
		brightness?: number;
		contrast?: number;
		saturation?: number;
		hue?: number;
		grayscale?: number;
		sepia?: number;
		invertColors?: number;
		thresholding?: number;
		sharpness?: number;
		edgeDetection?: number;
		selectedGradient?: GradientName;
		useCanvasRenderer?: boolean;
		hasAdjustments?: boolean;
		isAnimatedImage?: boolean;
		animationFrameLimit?: number;
		animationFrameSkip?: number;
		animationPlaybackSpeed?: number;
		actions?: Snippet;
		onfileselect?: (file: File | null) => void;
		onreset?: () => void;
	}>();

	let showBasicControls = $state(false);
	let showColorControls = $state(false);
	let showEffectsControls = $state(false);
	let showAdvancedControls = $state(false);
	let showAnimationControls = $state(false);

	const gradientOptions = Object.keys(ASCII_GRADIENTS).map((key) => ({ value: key, label: key }));
	// const ditheringOptions = Object.keys(DITHERING_METHODS).map((key) => ({
	// 	value: key,
	// 	label: key
	// }));

	let renderMode = $state(useCanvasRenderer ? 'canvas' : 'dom');

	$effect(() => {
		useCanvasRenderer = renderMode === 'canvas';
	});

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		// small delay
		setTimeout(() => {
			target.value = '';
		}, 200);

		if (file) {
			onfileselect?.(file);
		}
	}

	function handleResetClick() {
		onreset?.();
	}
</script>

<section class="controls-panel">
	<div class="upload-card" class:drag-ready={dragActive}>
		<label class="file-input-overlay" for="image-upload" aria-label="Upload file"></label>
		<div class="upload-content">
			<div class="file-input-label">
				<span class="upload-title desktop-text"
					>{hasImage
						? 'Replace image/animated sequence'
						: 'Upload or drop an image/animated sequence'}</span
				>
				<span class="upload-title mobile-text"
					>{hasImage
						? 'Tap here to replace image/sequence'
						: 'Tap here to upload an image/sequence'}</span
				>
				<span class="upload-hint">PNG, JPG, GIF, SVG, WEBP, APNG...</span>
				<span class="file-name" title={selectedFileName || 'No file selected'}>
					{selectedFileName || 'No file selected'}
				</span>
			</div>
			<p class="drag-helper">
				<span class="desktop-text"
					>Drag a file anywhere on the page to load an image or animated sequence</span
				>
				<span class="mobile-text">Tap the area above to load an image or sequence</span>
			</p>
		</div>
		<div class="upload-meta">
			<button
				type="button"
				class="ghost-button"
				onclick={handleResetClick}
				disabled={!hasImage || !hasAdjustments}
			>
				Reset adjustments
			</button>
		</div>
		<input
			id="image-upload"
			type="file"
			accept="image/*"
			class="file-input"
			onchange={handleFileSelect}
		/>
	</div>

	{#if hasImage && !hasError}
		<div class="controls-grid">
			<ControlSection title="Basic Settings" bind:isOpen={showBasicControls}>
				<SliderControl
					id="characters-control"
					label="Characters"
					min={20}
					max={200}
					bind:value={characters}
				/>
				<SelectControl
					id="gradient-select"
					label="ASCII Gradient"
					bind:value={selectedGradient}
					options={gradientOptions}
				/>
				<SliderControl
					id="brightness-control"
					label="Brightness"
					min={0}
					max={200}
					bind:value={brightness}
					format={(val) => `${val}%`}
				/>
				<SliderControl
					id="contrast-control"
					label="Contrast"
					min={0}
					max={200}
					bind:value={contrast}
					format={(val) => `${val}%`}
				/>
			</ControlSection>

			<ControlSection title="Color Adjustments" bind:isOpen={showColorControls}>
				<SliderControl
					id="saturation-control"
					label="Saturation"
					min={0}
					max={200}
					bind:value={saturation}
					format={(val) => `${val}%`}
				/>
				<SliderControl
					id="hue-control"
					label="Hue"
					min={0}
					max={360}
					bind:value={hue}
					format={(val) => `${val}°`}
				/>
				<SliderControl
					id="grayscale-control"
					label="Grayscale"
					min={0}
					max={100}
					bind:value={grayscale}
					format={(val) => `${val}%`}
				/>
				<SliderControl
					id="sepia-control"
					label="Sepia"
					min={0}
					max={100}
					bind:value={sepia}
					format={(val) => `${val}%`}
				/>
				<SliderControl
					id="invert-control"
					label="Invert Colors"
					min={0}
					max={100}
					bind:value={invertColors}
					format={(val) => `${val}%`}
				/>
			</ControlSection>

			<ControlSection title="Effects" bind:isOpen={showEffectsControls}>
				<SliderControl
					id="sharpness-control"
					label="Sharpness"
					min={0}
					max={20}
					step={0.1}
					bind:value={sharpness}
					format={(val) => `${val.toFixed(1)}`}
				/>
				<SliderControl
					id="edge-control"
					label="Edge Detection"
					min={1}
					max={10}
					bind:value={edgeDetection}
				/>
				<SliderControl
					id="threshold-control"
					label="Thresholding"
					min={0}
					max={255}
					bind:value={thresholding}
				/>
			</ControlSection>

			{#if isAnimatedImage}
				<ControlSection title="Animation" bind:isOpen={showAnimationControls}>
					<SliderControl
						id="animation-frame-limit"
						label="Frame limit"
						min={2}
						max={400}
						step={1}
						bind:value={animationFrameLimit}
					/>
					<SliderControl
						id="animation-frame-skip"
						label="Frame skip"
						min={1}
						max={10}
						step={1}
						bind:value={animationFrameSkip}
						format={(val) => `Every ${val} frame${val === 1 ? '' : 's'}`}
					/>
					<SliderControl
						id="animation-speed"
						label="Playback speed"
						min={0.25}
						max={10}
						step={0.25}
						bind:value={animationPlaybackSpeed}
						format={(val) => `${val.toFixed(2)}x`}
					/>
				</ControlSection>
			{/if}

			<ControlSection title="Advanced" bind:isOpen={showAdvancedControls}>
				<SelectControl
					id="render-mode-select"
					label="Render Mode"
					bind:value={renderMode}
					options={RENDER_MODE_OPTIONS}
				/>
				<!-- ! TODO: Implement these controls -->
				<!-- <SliderControl
					id="space-density-control"
					label="Space Density"
					min={0}
					max={1}
					step={0.1}
					bind:value={spaceDensity}
					format={(val) => `${val.toFixed(1)}`}
				/>
				<SelectControl
					id="dithering-select"
					label="Dithering Method"
					bind:value={ditheringMethod}
					options={ditheringOptions}
				/> -->
			</ControlSection>
		</div>

		{@render actions?.()}
	{/if}
</section>

<style>
	.controls-panel {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
		transition:
			height 0.3s ease,
			padding 0.3s ease;
	}

	@media (min-width: 768px) {
		.controls-panel {
			padding: 1.5rem;
		}
	}

	.upload-card {
		position: relative;
		border: 1px dashed var(--border-color);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition:
			border-color 0.2s ease,
			background 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.upload-card:hover {
		border-color: var(--gray-500);
		background: var(--bg-tertiary);
	}

	.upload-card.drag-ready {
		border-color: var(--gray-500);
		background: var(--bg-tertiary);
	}

	.file-input-overlay {
		position: absolute;
		inset: 0;
		cursor: pointer;
		z-index: 1;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.file-input-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		margin: -0.5rem;
		-webkit-tap-highlight-color: transparent;
		pointer-events: none;
	}

	@media (hover: none) {
		.file-input-label:active {
			opacity: 0.7;
		}
	}

	.upload-title {
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.mobile-text {
		display: inline;
	}

	.desktop-text {
		display: none;
	}

	@media (min-width: 768px) {
		.upload-title {
			font-size: 1rem;
		}

		.mobile-text {
			display: none;
		}

		.desktop-text {
			display: inline;
		}
	}

	.upload-hint,
	.drag-helper {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.file-name {
		font-size: 0.875rem;
		color: var(--text-primary);
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.upload-meta {
		display: flex;
		justify-content: flex-end;
		position: relative;
		z-index: 2;
		pointer-events: none;
	}

	.ghost-button {
		padding: 0.625rem 1rem;
		min-height: 44px;
		background: var(--bg-secondary);
		border: 1px solid var(--gray-400);
		color: var(--text-primary);
		cursor: pointer;
		font-family: 'Inconsolata', monospace;
		font-size: 0.875rem;
		transition:
			background 0.2s ease,
			border-color 0.2s ease;
		-webkit-tap-highlight-color: transparent;
		pointer-events: auto;
	}

	.ghost-button:hover:enabled {
		background: var(--bg-tertiary);
		border-color: var(--gray-500);
	}

	@media (hover: none) {
		.ghost-button:hover:enabled {
			background: transparent;
		}

		.ghost-button:active:enabled {
			background: var(--bg-tertiary);
			border-color: var(--gray-500);
		}
	}

	.ghost-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.controls-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		min-width: 0;
	}

	@media (min-width: 768px) {
		.controls-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
			gap: 0.75rem;
		}
	}
</style>
