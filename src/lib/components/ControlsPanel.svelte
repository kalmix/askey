<script lang="ts">
	import { type Snippet } from 'svelte';

	import {
		ASCII_GRADIENTS,
		DITHERING_METHODS,
		RENDER_MODE_OPTIONS,
		type DitheringName,
		type GradientName,
		type PaletteName
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
		crtGlowEnabled = $bindable(false),
		crtGlowPreset = $bindable('color'),
		crtGlowIntensity = $bindable(3),
		crtScanlineIntensity = $bindable(30),
		asciiFontSize = $bindable(10),
		asciiFontFamily = $bindable("'Inconsolata', monospace"),
		ditheringMethod = $bindable('None'),
		spaceDensity = $bindable(1),
		colorPalette = $bindable('None'),
		colorQuantization = $bindable(16),
		interactiveHover = $bindable(false),
		phosphorDecay = $bindable(0),
		customTintEnabled = $bindable(false),
		customTintColor = $bindable('#00ff00'),
		actions,
		onfileselect,
		onreset,
		isAskeyLoaded = false
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
		crtGlowEnabled?: boolean;
		crtGlowPreset?: 'color' | 'green' | 'amber' | 'cyan';
		crtGlowIntensity?: number;
		crtScanlineIntensity?: number;
		asciiFontSize?: number;
		asciiFontFamily?: string;
		ditheringMethod?: DitheringName;
		spaceDensity?: number;
		colorPalette?: 'None' | PaletteName;
		colorQuantization?: number;
		interactiveHover?: boolean;
		phosphorDecay?: number;
		customTintEnabled?: boolean;
		customTintColor?: string;
		actions?: Snippet;
		onfileselect?: (file: File | null) => void;
		onreset?: () => void;
		isAskeyLoaded?: boolean;
	}>();

	let showBasicControls = $state(false);
	let showColorControls = $state(false);
	let showEffectsControls = $state(false);
	let showAdvancedControls = $state(false);
	let showAnimationControls = $state(false);

	const gradientOptions = Object.keys(ASCII_GRADIENTS).map((key) => ({ value: key, label: key }));
	const ditheringOptions = Object.keys(DITHERING_METHODS).map((key) => ({
		value: key,
		label: key
	}));

	const fontOptions = [
		{ value: "'Inconsolata', monospace", label: 'Inconsolata (Default)' },
		{ value: "'VT323', 'Terminal', monospace", label: 'Terminal (Windows XP CMD)' },
		{ value: "'Fixedsys Excelsior', 'Fixedsys', monospace", label: 'Fixedsys (Retro Windows)' },
		{ value: "'Lucida Console', monospace", label: 'Lucida Console' },
		{ value: "'Courier New', Courier, monospace", label: 'Courier New' },
		{ value: "Consolas, 'Courier New', monospace", label: 'Consolas' },
		{ value: 'monospace', label: 'System Monospace' }
	];

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
			{#if isAskeyLoaded}
				<p class="askey-notice">This is a Pre-rendered .askey; image controls have no effect.</p>

				<ControlSection title="Effects" bind:isOpen={showEffectsControls}>
					<div class="control-row-full font-divider" style="border-top: none; padding-top: 0;">
						<label class="control-toggle">
							<span class="control-label">Enable CRT Glow</span>
							<input type="checkbox" bind:checked={crtGlowEnabled} />
						</label>
					</div>
					{#if crtGlowEnabled}
						<SelectControl id="crt-preset-select" label="CRT Color Preset" bind:value={crtGlowPreset} options={[{ value: 'color', label: 'Color CRT (Original)' }, { value: 'green', label: 'Green Phosphor' }, { value: 'amber', label: 'Amber Terminal' }, { value: 'cyan', label: 'Cyberpunk Cyan' }]} />
						<SliderControl id="crt-glow-intensity" label="Glow Intensity" min={1} max={5} step={0.5} bind:value={crtGlowIntensity} format={(val) => `${val.toFixed(1)}`} />
						<SliderControl id="crt-scanline-intensity" label="Scanline Intensity" min={0} max={100} bind:value={crtScanlineIntensity} format={(val) => `${val}%`} />
					{/if}
					<div class="control-row-full font-divider" style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
						<label class="control-toggle">
							<span class="control-label">Experimental Mouse Hover</span>
							<input type="checkbox" bind:checked={interactiveHover} />
						</label>
					</div>
				</ControlSection>

				{#if isAnimatedImage}
					<ControlSection title="Animation" bind:isOpen={showAnimationControls}>
						<SliderControl id="animation-speed" label="Playback speed" min={0.25} max={10} step={0.25} bind:value={animationPlaybackSpeed} format={(val) => `${val.toFixed(2)}x`} />
						<SliderControl id="phosphor-decay" label="Phosphor Decay" min={0} max={95} step={5} bind:value={phosphorDecay} format={(val) => (val === 0 ? 'Off' : `${val}%`)} />
					</ControlSection>
				{/if}

				<ControlSection title="Advanced" bind:isOpen={showAdvancedControls}>
					<SelectControl id="render-mode-select" label="Render Mode" bind:value={renderMode} options={RENDER_MODE_OPTIONS} />
					<SelectControl id="font-family-select" label="Font Type" bind:value={asciiFontFamily} options={fontOptions} />
					<SliderControl id="font-size-control" label="Font Size" min={6} max={24} step={1} bind:value={asciiFontSize} format={(val) => `${val}px`} />
				</ControlSection>
			{:else}
				<ControlSection title="Basic Settings" bind:isOpen={showBasicControls}>
					<SliderControl id="characters-control" label="Characters" min={20} max={200} bind:value={characters} />
					<SelectControl id="gradient-select" label="ASCII Gradient" bind:value={selectedGradient} options={gradientOptions} />
					<SliderControl id="brightness-control" label="Brightness" min={0} max={200} bind:value={brightness} format={(val) => `${val}%`} />
					<SliderControl id="contrast-control" label="Contrast" min={0} max={200} bind:value={contrast} format={(val) => `${val}%`} />
				</ControlSection>

				<ControlSection title="Color Adjustments" bind:isOpen={showColorControls}>
					<SliderControl id="saturation-control" label="Saturation" min={0} max={200} bind:value={saturation} format={(val) => `${val}%`} />
					<SliderControl id="hue-control" label="Hue" min={0} max={360} bind:value={hue} format={(val) => `${val}°`} />
					<SliderControl id="grayscale-control" label="Grayscale" min={0} max={100} bind:value={grayscale} format={(val) => `${val}%`} />
					<SliderControl id="sepia-control" label="Sepia" min={0} max={100} bind:value={sepia} format={(val) => `${val}%`} />
					<SliderControl id="invert-control" label="Invert Colors" min={0} max={100} bind:value={invertColors} format={(val) => `${val}%`} />
					<SelectControl id="palette-select" label="Retro Palette" bind:value={colorPalette} options={[{ value: 'None', label: 'None' }, { value: 'c64', label: 'Commodore 64' }, { value: 'gameboy', label: 'Game Boy' }, { value: 'cga', label: 'CGA' }, { value: 'nes', label: 'NES' }, { value: 'pico8', label: 'PICO-8' }]} />
					<SliderControl id="quantization-control" label="Color Quantization" min={1} max={64} step={1} bind:value={colorQuantization} format={(val) => (val === 1 ? 'None (Full Color)' : `Step ${val}`)} />
					<div class="control-row-full font-divider" style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
						<label class="control-toggle">
							<span class="control-label">Custom Color Tint</span>
							<input type="checkbox" bind:checked={customTintEnabled} />
						</label>
					</div>
					{#if customTintEnabled}
						<div class="control-row" style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem;">
							<span class="control-label">Tint Color</span>
							<div class="color-picker-wrapper" style="display: flex; align-items: center; gap: 0.5rem;">
								<span style="font-family: 'Inconsolata', monospace; font-size: 0.85rem; text-transform: uppercase; color: var(--text-secondary);">{customTintColor}</span>
								<input type="color" bind:value={customTintColor} style="cursor: pointer; width: 28px; height: 28px; border: 1px solid var(--border-color); border-radius: 4px; background: none; padding: 0;" />
							</div>
						</div>
					{/if}
				</ControlSection>

				<ControlSection title="Effects" bind:isOpen={showEffectsControls}>
					<SliderControl id="sharpness-control" label="Sharpness" min={0} max={20} step={0.1} bind:value={sharpness} format={(val) => `${val.toFixed(1)}`} />
					<SliderControl id="edge-control" label="Edge Detection" min={1} max={10} bind:value={edgeDetection} />
					<SliderControl id="threshold-control" label="Thresholding" min={0} max={255} bind:value={thresholding} />
					<div class="control-row-full font-divider" style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
						<label class="control-toggle">
							<span class="control-label">Enable CRT Glow</span>
							<input type="checkbox" bind:checked={crtGlowEnabled} />
						</label>
					</div>
					{#if crtGlowEnabled}
						<SelectControl id="crt-preset-select" label="CRT Color Preset" bind:value={crtGlowPreset} options={[{ value: 'color', label: 'Color CRT (Original)' }, { value: 'green', label: 'Green Phosphor' }, { value: 'amber', label: 'Amber Terminal' }, { value: 'cyan', label: 'Cyberpunk Cyan' }]} />
						<SliderControl id="crt-glow-intensity" label="Glow Intensity" min={1} max={5} step={0.5} bind:value={crtGlowIntensity} format={(val) => `${val.toFixed(1)}`} />
						<SliderControl id="crt-scanline-intensity" label="Scanline Intensity" min={0} max={100} bind:value={crtScanlineIntensity} format={(val) => `${val}%`} />
					{/if}
					<div class="control-row-full font-divider" style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
						<label class="control-toggle">
							<span class="control-label">Experimental Mouse Hover</span>
							<input type="checkbox" bind:checked={interactiveHover} />
						</label>
					</div>
				</ControlSection>

				{#if isAnimatedImage}
					<ControlSection title="Animation" bind:isOpen={showAnimationControls}>
						<SliderControl id="animation-frame-limit" label="Frame limit" min={2} max={500} step={1} bind:value={animationFrameLimit} />
						<SliderControl id="animation-frame-skip" label="Frame skip" min={1} max={10} step={1} bind:value={animationFrameSkip} format={(val) => `Every ${val} frame${val === 1 ? '' : 's'}`} />
						<SliderControl id="animation-speed" label="Playback speed" min={0.25} max={10} step={0.25} bind:value={animationPlaybackSpeed} format={(val) => `${val.toFixed(2)}x`} />
						<SliderControl id="phosphor-decay" label="Phosphor Decay" min={0} max={95} step={5} bind:value={phosphorDecay} format={(val) => (val === 0 ? 'Off' : `${val}%`)} />
					</ControlSection>
				{/if}

				<ControlSection title="Advanced" bind:isOpen={showAdvancedControls}>
					<SelectControl id="render-mode-select" label="Render Mode" bind:value={renderMode} options={RENDER_MODE_OPTIONS} />
					<SelectControl id="font-family-select" label="Font Type" bind:value={asciiFontFamily} options={fontOptions} />
					<SliderControl id="font-size-control" label="Font Size" min={6} max={24} step={1} bind:value={asciiFontSize} format={(val) => `${val}px`} />
					<SliderControl id="space-density-control" label="Space Density" min={0} max={1} step={0.1} bind:value={spaceDensity} format={(val) => `${val.toFixed(1)}`} />
					<SelectControl id="dithering-select" label="Dithering Method" bind:value={ditheringMethod} options={ditheringOptions} />
				</ControlSection>
			{/if}

			{@render actions?.()}
		</div>
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

	.askey-notice {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		border-left: 2px solid var(--border-color);
		padding: 0.35rem 0.6rem;
		margin-bottom: 0.25rem;
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

	.control-row-full {
		width: 100%;
		display: block;
	}

	.control-toggle {
		display: grid;
		grid-template-columns: minmax(0, 140px) minmax(0, 1fr);
		align-items: center;
		gap: 1rem;
		width: 100%;
		min-width: 0;
		cursor: pointer;
	}

	.control-toggle .control-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.control-toggle input {
		margin: 0;
		accent-color: var(--gray-600);
		cursor: pointer;
		width: 1.15rem;
		height: 1.15rem;
		justify-self: start;
	}

	@media (max-width: 768px) {
		.control-toggle {
			grid-template-columns: 1fr auto;
			gap: 0.5rem;
		}
		.control-toggle input {
			justify-self: end;
		}
	}
</style>
