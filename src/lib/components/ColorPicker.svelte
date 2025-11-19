<script lang="ts">
	import { browser } from '$app/environment';
	import { sanitizeHexColor } from '$lib/workbench/color';

	export let id = 'color-picker';
	export let label = 'Color';
	export let color = '#000000';
	export let alpha = 100;
	export let alphaLabel = 'Opacity';

	let colorInput: HTMLInputElement;

	$: alphaProgress = Math.min(100, Math.max(0, alpha));

	$: {
		const safeColor = sanitizeHexColor(color);
		if (safeColor !== color) {
			color = safeColor;
		}
	}

	function openNativePicker() {
		if (!browser) return;
		colorInput?.showPicker?.() ?? colorInput?.click();
	}
</script>

<div class="color-picker-control">
	<div class="color-picker-head">
		<label for={id}>{label}</label>
		<span class="color-value">{color.toUpperCase()}</span>
	</div>
	<button 
		type="button" 
		class="color-swatch" 
		style={`--swatch-color: ${color}`} 
		on:click={openNativePicker} 
		aria-label={`Select ${label}`}
	>
		<div class="swatch-preview">
			<span class="swatch-fill"></span>
		</div>
	</button>
	<input
		{id}
		class="native-color-input"
		type="color"
		bind:this={colorInput}
		bind:value={color}
		aria-label={label}
	/>
	<div class="alpha-control">
		<label class="alpha-label" for={`${id}-alpha`}>{alphaLabel}</label>
		<input
			id={`${id}-alpha`}
			type="range"
			min="0"
			max="100"
			step="1"
			class="range-track alpha-range"
			style={`--slider-progress: ${alphaProgress}%`}
			bind:value={alpha}
			aria-label={alphaLabel}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={alpha}
		/>
		<span class="alpha-value">{alpha}%</span>
	</div>
</div>

<style>
	.color-picker-control {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 220px;
	}

	.color-picker-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-family: 'Inconsolata', monospace;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.color-value {
		font-size: 0.75rem;
		color: var(--text-primary);
	}

	.color-swatch {
		position: relative;
		width: 100%;
		height: 2.75rem;
		border: 1px solid var(--border-color);
		background: transparent;
		padding: 0;
		cursor: pointer;
		overflow: hidden;
		transition: border-color 0.15s ease, transform 0.15s ease;
	}

	.color-swatch:hover,
	.color-swatch:focus-visible {
		border-color: var(--gray-500);
		transform: translateY(-1px);
	}

	.swatch-preview {
		position: absolute;
		inset: 0;
	}

	.swatch-fill {
		position: absolute;
		inset: 0;
		background: var(--swatch-color);
	}

	.native-color-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	.alpha-control {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.alpha-control .alpha-range {
		flex: 1;
		min-width: 0;
	}

	.alpha-label {
		font-size: 0.75rem;
		font-family: 'Inconsolata', monospace;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.alpha-value {
		min-width: 2.75rem;
		text-align: right;
		color: var(--text-primary);
		flex-shrink: 0;
	}
</style>