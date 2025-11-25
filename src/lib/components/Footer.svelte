<script lang="ts">
	const version = __APP_VERSION__;
</script>

<footer class="app-footer">
	<p class="footer-content">
		<a href="https://kalmix.vercel.app/" target="_blank" rel="noopener noreferrer"
			>Made by <img src="img/logo.avif" alt="logo" class="kalmix-logo" /></a
		>
		with
		<span class="heart">♥</span>
	</p>
	<p class="footer-links">
		<a href="https://github.com/kalmix/askey" target="_blank" rel="noopener noreferrer"
			>Source Code</a
		>
		/
		<a href="https://github.com/kalmix/askey/issues" target="_blank" rel="noopener noreferrer"
			>Report Issues & Bugs</a
		>
		/
		<a href="https://github.com/kalmix/askey-player" target="_blank" rel="noopener noreferrer"
			>Docs</a
		>
		/
		<a href="https://ko-fi.com/kalmix" target="_blank" rel="noopener noreferrer">Donations</a>
	</p>
	<p class="footer-copyright footer-links">
		© Kalmix, {new Date().getFullYear()}.
		<a href="https://choosealicense.com/licenses/mit/" target="_blank" rel="noopener noreferrer"
			>Licensed under MIT.</a
		>
	</p>
	<p class="footer-version">
		<a
			href="https://github.com/kalmix/askey/fork"
			target="_blank"
			rel="noopener noreferrer"
			class="version-badge"
		>
			<span class="fork-icon">⑂</span>
			{version}-(canvas)
		</a>
	</p>
</footer>

<style>
	.app-footer {
		width: 100vw;
		margin-left: -1.5rem;
		margin-bottom: -1.5rem;
		margin-top: 2rem;
		padding: 2rem 1.5rem;
		text-align: center;
		border-top: 1px solid var(--border-color, #333);
		background: var(--bg-secondary, #1a1a1a);
		position: relative;
	}

	.footer-content {
		margin: 0 0 0.5rem 0;
		font-size: 0.95rem;
	}

	.footer-content a {
		color: var(--text-primary, #fff);
		text-decoration: none;
		font-weight: 500;
	}

	.footer-content a:hover {
		text-decoration: underline;
	}

	.heart {
		margin-left: 0.25rem;
		display: inline-block;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	.kalmix-logo {
		width: 1rem;
		height: 1rem;
		vertical-align: middle;
		margin-left: 0.1rem;
		margin-bottom: 0.1rem;
		filter: brightness(0) invert(1) saturate(100%);
	}

	:global(body.light) .kalmix-logo {
		filter: brightness(0) invert(0) saturate(100%);
	}

	.footer-links {
		margin: 0.5rem 0;
		font-size: 0.9rem;
	}

	.footer-links a {
		color: var(--accent-color, #4a9eff);
		text-decoration: none;
	}

	.footer-links a:hover {
		text-decoration: underline;
	}

	.footer-copyright {
		margin: 0.5rem 0 0 0;
		font-size: 0.85rem;
		color: var(--text-secondary, #888);
	}

	.footer-version {
		position: absolute;
		right: 1.5rem;
		bottom: 2rem;
		margin: 0;
	}

	@media (max-width: 815px) {
		.footer-version {
			display: none;
		}
	}

	.version-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: 1.15rem;
		padding: 0.4rem 0.8rem;
		background: transparent;
		border: 1px solid var(--border-color, #333);
		color: var(--text-primary, #fff);
		text-decoration: none;
		font-family: 'Inconsolata', monospace;
		font-size: 0.8rem;
		transition:
			background 0.2s ease,
			border-color 0.2s ease;
	}

	.version-badge:hover {
		background: var(--bg-tertiary, #222);
		border-color: var(--gray-500, #666);
		text-decoration: none;
	}

	.fork-icon {
		font-size: 1.2em;
		line-height: 1;
	}
</style>
