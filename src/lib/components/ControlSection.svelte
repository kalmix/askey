<script lang="ts">
	import { slide } from 'svelte/transition';

	interface Props {
		title: string;
		isOpen?: boolean;
		ontoggle?: (isOpen: boolean) => void;
		children?: import('svelte').Snippet;
	}

	let { title, isOpen = $bindable(true), ontoggle, children }: Props = $props();

	const sectionId = `control-section-${crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 9)}`;
	const contentId = `${sectionId}-content`;

	function handleToggle() {
		isOpen = !isOpen;
		ontoggle?.(isOpen);
	}
</script>

<div class="control-section">
	<button
		type="button"
		class="section-header"
		onclick={handleToggle}
		aria-expanded={isOpen}
		aria-controls={contentId}
	>
		<span class="section-title">{title}</span>
		<span class="section-icon" class:collapsed={!isOpen}>▼</span>
	</button>
	{#if isOpen}
		<div class="section-content" id={contentId} transition:slide={{ duration: 200 }}>
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	.control-section {
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
		width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.section-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1rem;
		background: var(--bg-tertiary);
		border: none;
		cursor: pointer;
		transition: background 0.2s ease;
		color: var(--text-primary);
		font-family: 'Inconsolata', monospace;
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.section-header:hover {
		background: var(--input-bg);
	}

	.section-title {
		font-weight: 600;
	}

	.section-icon {
		font-size: 0.875rem;
		transition: transform 0.2s ease;
		display: inline-block;
		opacity: 0.7;
	}

	.section-icon.collapsed {
		transform: rotate(-90deg);
	}

	.section-header:hover .section-icon {
		opacity: 1;
	}

	.section-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		width: 100%;
		min-width: 0;
	}
</style>
