<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		disabled?: boolean;
		isAnimated?: boolean;
	}

	let { disabled = false, isAnimated = false }: Props = $props();

	type ActionEvent =
		| 'copy'
		| 'downloadTxt'
		| 'downloadSvg'
		| 'downloadPng'
		| 'downloadWebp'
		| 'downloadGif'
		| 'downloadApng'
		| 'exportAnimation';

	const dispatch = createEventDispatcher<{
		copy: void;
		downloadTxt: void;
		downloadSvg: void;
		downloadPng: void;
		downloadWebp: void;
		downloadGif: void;
		downloadApng: void;
		exportAnimation: void;
	}>();

	let copyFeedback = $state(false);

	const emit = (eventName: ActionEvent) => () => {
		if (eventName === 'copy') {
			copyFeedback = true;
			setTimeout(() => {
				copyFeedback = false;
			}, 2000);
		}
		dispatch(eventName);
	};

</script>

<div class="action-buttons" role="region" aria-label="Export and copy actions">
	<div class="button-group primary-actions" role="group" aria-label="Clipboard actions">
		<button
			type="button"
			onclick={emit('copy')}
			disabled={disabled}
			class:copied={copyFeedback}
			aria-live="polite"
			aria-label={copyFeedback ? 'ASCII copied to clipboard' : 'Copy ASCII text to clipboard'}
		>
			{copyFeedback ? 'Copied!' : 'Copy Text'}
		</button>
	</div>
	
	<div class="button-group export-actions" role="group" aria-label="Static export formats">
		<div class="group-label">Export Formats</div>
		<div class="button-row">
			<button type="button" onclick={emit('downloadTxt')} disabled={disabled} aria-label="Download ASCII as TXT">TXT</button>
			<button type="button" onclick={emit('downloadSvg')} disabled={disabled} aria-label="Download ASCII as SVG">SVG</button>
			<button type="button" onclick={emit('downloadPng')} disabled={disabled} aria-label="Download ASCII as PNG">PNG</button>
			<button type="button" onclick={emit('downloadWebp')} disabled={disabled} aria-label="Download ASCII as WebP">WebP</button>
		</div>
	</div>

	{#if isAnimated}
		<div class="button-group animation-actions" role="group" aria-label="Animation export formats">
			<div class="group-label">Animation Formats</div>
			<div class="button-row">
				<button type="button" onclick={emit('downloadApng')} disabled={disabled} aria-label="Download ASCII animation as APNG">APNG</button>
				<button type="button" onclick={emit('downloadGif')} disabled={disabled} aria-label="Download ASCII animation as GIF">GIF</button>
				<button
					type="button"
					onclick={emit('exportAnimation')}
					disabled={disabled}
					class="export-json"
					aria-label="Export animation data for askey player"
				>
					Export JSON (askey-player.js)
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.action-buttons {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: -webkit-fill-available; 
	}

	.button-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}

	.button-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 0.5rem;
	}

	.primary-actions {
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}

	.action-buttons button {
		padding: 0.75rem 1rem;
		background: var(--gray-800);
		border: 1px solid var(--gray-700);
		color: var(--gray-50);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		font-family: 'Inconsolata', monospace;
		white-space: nowrap;
		text-align: center;
	}

	:global(body.light) .action-buttons button {
		background: var(--gray-950);
		border-color: var(--gray-800);
		color: var(--gray-50);
	}

	.action-buttons button:hover:enabled {
		background: var(--gray-700);
		border-color: var(--gray-600);
		transform: translateY(-1px);
	}

	:global(body.light) .action-buttons button:hover:enabled {
		background: var(--gray-900);
		border-color: var(--gray-700);
	}

	.action-buttons button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.action-buttons button.copied {
		background: var(--gray-900);
		border-color: var(--gray-50);
		color: #fff;
	}

	:global(body.light) .action-buttons button.copied {
		background: var(--gray-800);
		border-color: var(--gray-50);
		color: #fff;
	}

	.export-json {
		grid-column: 1 / -1;
	}

	@media (max-width: 768px) {
		.button-row {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (min-width: 1024px) {
		.button-row {
			grid-template-columns: repeat(4, 1fr);
		}
		
		.export-json {
			grid-column: auto;
		}
	}
</style>
