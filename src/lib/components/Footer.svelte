<footer class="app-footer">
	<p class="footer-content">
		<a href="https://kalmix.vercel.app/" target="_blank" rel="noopener noreferrer"
			>Made by <img
				src="https://ucarecdn.com/791c0f2f-450e-43bb-a022-ebd24e19f8c4/-/preview/50x50/"
				alt="logo"
				class="kalmix-logo"
			/></a
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
		© Kalmix, {new Date().getFullYear()}. <a href="https://choosealicense.com/licenses/mit/" target="_blank" rel="noopener noreferrer">Licensed under MIT.</a>
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
</style>
