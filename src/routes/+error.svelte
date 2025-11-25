<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status);
	const error = $derived(page.error);

	const title = $derived(
		status >= 500 ? 'Something went wrong' : 'This is a Single Page Application... (╯°□°)╯'
	);
	const description = $derived(error?.message ?? 'Watafaka.. (╯°□°)╯︵ ┻━┻');
</script>

<section class="error-shell" aria-live="assertive" role="alert">
	<div class="error-card">
		<p class="error-status">{status}</p>
		<h1 class="site-title">{title}</h1>
		<p class="inc-font">{description}</p>
		<a class="home-link" href="https://askey.vercel.app/" aria-label="Back to home">Return home</a>
	</div>
</section>

<style>
	* {
		box-sizing: border-box;
	}

	.inc-font {
		font-family: 'Inconsolata', monospace;
	}

	.error-shell {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-primary, #050505);
		padding: 2rem;
	}

	.error-card {
		border: 1px solid var(--border-color, #2c2c2c);
		background: var(--bg-secondary, #0b0b0b);
		padding: 2rem;
		max-width: 480px;
		text-align: center;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
	}

	.error-status {
		font-size: 4rem;
		margin: 0 0 0.5rem;
		color: var(--text-secondary, #9d9d9d);
	}

	h1 {
		margin: 0 0 0.75rem;
		font-size: 1.75rem;
		color: var(--text-primary, #f8f8f8);
		font-family: 'Inconsolata', monospace !important;
	}

	p {
		margin: 0 0 1.5rem;
		color: var(--text-secondary, #bdbdbd);
		line-height: 1.5;
		font-family: 'Inconsolata', monospace !important;
	}

	.home-link {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		padding: 0.75rem 1.25rem;
		border: 1px solid var(--border-color, #2c2c2c);
		color: var(--text-primary, #f8f8f8);
		text-decoration: none;
		font-family: 'Inconsolata', monospace;
		transition:
			background 0.2s ease,
			border-color 0.2s ease;
	}

	.home-link:hover,
	.home-link:focus-visible {
		background: var(--bg-tertiary, #111);
		border-color: var(--gray-500, #4b5563);
	}
</style>
