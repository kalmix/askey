<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let id: string;
	export let label: string;
	export let value: number;
	export let min = 0;
	export let max = 100;
	export let step = 1;
	export let format: (value: number) => string = (val) => `${val}`;

	const dispatch = createEventDispatcher<{ value: number }>();

	const clampValue = (nextValue: number) => Math.min(max, Math.max(min, nextValue));
	let sliderProgress = 0;
	$: sliderProgress = max === min ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

	function commitValue(nextValue: number) {
		if (Number.isNaN(nextValue)) return;
		value = clampValue(nextValue);
		dispatch('value', value);
	}

	function handleInput(event: Event) {
		const nextValue = Number((event.target as HTMLInputElement).value);
		commitValue(nextValue);
	}
</script>

<div class="control-row">
	<label class="control-label" for={id}>{label}</label>
	<div class="control-input">
		<input
			id={id}
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			class="range-track"
			style={`--slider-progress: ${sliderProgress}%`}
			oninput={handleInput}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={value}
		/>
		<div class="value-stack">
			<span class="value">{format(value)}</span>
			<input
				class="value-input"
				type="number"
				value={value}
				min={min}
				max={max}
				step={step}
				onchange={handleInput}
			/>
		</div>
	</div>
</div>

<style>
	.control-row {
		display: grid;
		grid-template-columns: minmax(0, 140px) minmax(0, 1fr);
		align-items: center;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	.control-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.control-input {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		width: 100%;
		flex-wrap: wrap;
	}

	.control-input .range-track {
		flex: 1;
		min-width: 0;
	}

	.value {
		font-size: 0.875rem;
		color: var(--text-primary);
		font-weight: 600;
		min-width: 55px;
		text-align: right;
		flex-shrink: 0;
	}

	.value-stack {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.value-input {
		width: 65px;
		padding: 0.25rem 0.35rem;
		background: var(--input-bg);
		border: 1px solid var(--input-border);
		color: var(--text-primary);
		font-family: 'Inconsolata', monospace;
		font-size: 0.8125rem;
		text-align: right;
	}

	.value-input:focus {
		outline: 1px solid var(--gray-500);
		border-color: var(--gray-500);
	}

	@media (max-width: 768px) {
		.control-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}
</style>
