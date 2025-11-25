<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number;
		format?: (value: number) => string;
		onvalue?: (value: number) => void;
	}

	let {
		id,
		label,
		value = $bindable(),
		min = 0,
		max = 100,
		step = 1,
		format = (val) => `${val}`,
		onvalue
	}: Props = $props();

	const clampValue = (nextValue: number) => Math.min(max, Math.max(min, nextValue));
	let sliderProgress = $derived(
		max === min ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
	);

	function commitValue(nextValue: number) {
		if (Number.isNaN(nextValue)) return;
		value = clampValue(nextValue);
		onvalue?.(value);
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
			{id}
			type="range"
			{min}
			{max}
			{step}
			{value}
			class="range-track"
			style={`--slider-progress: ${sliderProgress}%`}
			oninput={handleInput}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={value}
		/>
		<div class="value-stack">
			<span class="value">{format(value)}</span>
			<input class="value-input" type="number" {value} {min} {max} {step} onchange={handleInput} />
		</div>
	</div>
</div>

<style>
	.control-row {
		display: grid;
		grid-template-columns: 1fr;
		align-items: flex-start;
		gap: 0.5rem;
		width: 100%;
		min-width: 0;
	}

	@media (min-width: 768px) {
		.control-row {
			grid-template-columns: minmax(0, 140px) minmax(0, 1fr);
			align-items: center;
			gap: 1rem;
		}
	}

	.control-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		padding-bottom: 0.25rem;
	}

	@media (min-width: 768px) {
		.control-label {
			padding-bottom: 0;
		}
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
		min-height: 44px;
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
		padding: 0.35rem 0.5rem;
		min-height: 44px;
		background: var(--input-bg);
		border: 1px solid var(--input-border);
		color: var(--text-primary);
		font-family: 'Inconsolata', monospace;
		font-size: 0.875rem;
		text-align: right;
		-webkit-tap-highlight-color: transparent;
	}

	@media (min-width: 768px) {
		.value-input {
			padding: 0.25rem 0.35rem;
			min-height: auto;
			font-size: 0.8125rem;
		}
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
