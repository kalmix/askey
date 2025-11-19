<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Option {
		value: string;
		label: string;
	}

	export let id: string;
	export let label: string;
	export let value: string;
	export let options: Option[];

	const dispatch = createEventDispatcher<{ value: string }>();

	function handleChange(event: Event) {
		value = (event.target as HTMLSelectElement).value;
		dispatch('value', value);
	}
</script>

<div class="control-row">
	<label class="control-label" for={id}>{label}</label>
	<select id={id} class="control-select" bind:value={value} onchange={handleChange}>
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
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

	.control-select {
		padding: 0.5rem;
		background: var(--input-bg);
		border: 1px solid var(--input-border);
		color: var(--text-primary);
		font-size: 0.875rem;
		font-family: 'Inconsolata', monospace;
		width: 100%;
		min-width: 0;
	}

	@media (max-width: 768px) {
		.control-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}
</style>