<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import { ASCII_GRADIENTS, DITHERING_METHODS, type DitheringName, type GradientName } from '$lib/ascii/constants';

	import ControlSection from './ControlSection.svelte';
	import SelectControl from './SelectControl.svelte';
	import SliderControl from './SliderControl.svelte';

	export let hasImage = false;
	export let hasError = false;
	export let selectedFileName = '';
	export let dragActive = false;
	export let characters: number;
	export let brightness: number;
	export let contrast: number;
	export let saturation: number;
	export let hue: number;
	export let grayscale: number;
	export let sepia: number;
	export let invertColors: number;
	export let thresholding: number;
	export let sharpness: number;
	export let edgeDetection: number;
	// export let spaceDensity: number;
	export let selectedGradient: GradientName;
	// export let ditheringMethod: DitheringName;
	export let hasAdjustments = false;
	export let isAnimatedImage = false;
	export let animationFrameLimit: number;
	export let animationFrameSkip: number;
	export let animationPlaybackSpeed: number;

	const dispatch = createEventDispatcher<{ fileSelect: File | null; reset: void }>();

	let showBasicControls = false;
	let showColorControls = false;
	let showEffectsControls = false;
	let showAdvancedControls = false;
	let showAnimationControls = false;

	const gradientOptions = Object.keys(ASCII_GRADIENTS).map((key) => ({ value: key, label: key }));
	const ditheringOptions = Object.keys(DITHERING_METHODS).map((key) => ({ value: key, label: key }));

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0] ?? null;
		target.value = '';
		dispatch('fileSelect', file);
	}

	function handleResetClick() {
		dispatch('reset');
	}
</script>

<section class="controls-panel">
	<div class="upload-card" class:drag-ready={dragActive}>
		<div class="upload-content">
			<label class="file-input-label" for="image-upload">
				<span class="upload-title">{hasImage ? 'Replace image/animated sequence' : 'Upload or drop an image/animated sequence'}</span>
				<span class="upload-hint">PNG, JPG, GIF, SVG, WEBP, APNG...</span>
				<span class="file-name" title={selectedFileName || 'No file selected'}>
					{selectedFileName || 'No file selected'}
				</span>
			</label>
			<p class="drag-helper">Drag a file anywhere on the page to load an image or animated sequence</p>
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
		<input id="image-upload" type="file" accept="image/*" class="file-input" onchange={handleFileSelect} />
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
						max={150}
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

			<!-- ! TODO -->
			<!-- <ControlSection title="Advanced" bind:isOpen={showAdvancedControls}>
				<SliderControl
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
				/>
			</ControlSection> -->
		</div>

		<slot name="actions"></slot>
	{/if}
</section>

<style>
	.controls-panel {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
		transition: height 0.3s ease, padding 0.3s ease;
	}

	.upload-card {
		border: 1px dashed var(--border-color);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.upload-card:hover {
		border-color: var(--gray-500);
		background: var(--bg-tertiary);
	}

	.upload-card.drag-ready {
		border-color: var(--gray-500);
		background: var(--bg-tertiary);
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
		cursor: pointer;
	}

	.upload-title {
		font-weight: 600;
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
	}

	.ghost-button {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		cursor: pointer;
		font-family: 'Inconsolata', monospace;
		font-size: 0.875rem;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.ghost-button:hover:enabled {
		background: var(--bg-tertiary);
		border-color: var(--gray-500);
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
