<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		const theme = localStorage.getItem('theme') || 'dark';
		document.body.className = theme;

		if (browser && import.meta.env.PROD && 'serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js', { type: 'module' })
				.catch((error) => console.error('Service worker registration failed', error));
		}
	});
</script>

<svelte:head>
	<title>asꄗ · Graphics to ASCII Converter</title>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="canonical" href="https://askey.vercel.app" />
	<meta
		name="description"
		content="Convert any static or animated image into ASCII art. Customize gradients, colors, and export to various formats."
	/>
	<meta
		name="keywords"
		content="ascii art,image converter,ascii animation,gif to ascii,terminal art generator,askey"
	/>
	<meta name="author" content="askey" />
	<meta property="og:title" content="asꄗ · Graphics to ASCII Converter" />
	<meta
		property="og:description"
		content="Convert any static or animated image into ASCII art. Customize gradients, colors, and export to various formats."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://askey.vercel.app" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="asꄗ · Graphics to ASCII Converter" />
	<meta name="twitter:description" content="Convert any static or animated image into ASCII art." />
	<meta name="theme-color" content="#fff" />
</svelte:head>

{@render children()}
