<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	import ActionButtons from '$lib/components/ActionButtons.svelte';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import ControlsPanel from '$lib/components/ControlsPanel.svelte';
	import OutputPanel from '$lib/components/OutputPanel.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { DitheringName, GradientName } from '$lib/ascii/constants';
	import type { ConvertedAsciiFrame } from '$lib/ascii/converter';
	import {
		copyAsciiToClipboard,
		downloadAsciiText,
		downloadPng,
		downloadSvg,
		downloadWebp,
		downloadAnimationJson,
		downloadGif,
		downloadApng
	} from '$lib/ascii/exporters';
	import { detectAnimatedFormat } from '$lib/ascii/animation';
	import {
		DEFAULT_CONTROLS,
		FLOAT_TOLERANCE,
		THEME_STORAGE_KEY,
		type ControlState,
		type Theme
	} from '$lib/workbench/constants';
	import { clampPercentage, getOpacityFromPercent, getRgbaColor, sanitizeHexColor } from '$lib/workbench/color';
	import { detectImageTransparency } from '$lib/workbench/imageProcessing';
	import { convertSourceToAscii, type AnimationFormat } from '$lib/workbench/conversion';

	type DownloadType = 'txt' | 'svg' | 'png' | 'webp' | 'gif' | 'apng';

	let theme = $state<Theme>('dark');
	let imageUrl = $state('');
	let imageName = $state('');
	let asciiOutput = $state('');
	let isProcessing = $state(false);
	let isDragActive = $state(false);
	let exportTransparent = $state(true);
	let exportBgHex = $state('#000000');
	let exportBgAlpha = $state(0);
	let imageHasTransparency = $state(false);
	let isAnimatedImage = $state(false);
	let animationFormat = $state<AnimationFormat>('none');
	let asciiFrames = $state<ConvertedAsciiFrame[]>([]);
	let currentFile = $state<File | null>(null);
	let isAnimationDetectionPending = $state(false);
	let errorMessage = $state<string>('');
	let hasError = $state(false);

	let characters = $state(DEFAULT_CONTROLS.characters);
	let brightness = $state(DEFAULT_CONTROLS.brightness);
	let contrast = $state(DEFAULT_CONTROLS.contrast);
	let saturation = $state(DEFAULT_CONTROLS.saturation);
	let hue = $state(DEFAULT_CONTROLS.hue);
	let grayscale = $state(DEFAULT_CONTROLS.grayscale);
	let sepia = $state(DEFAULT_CONTROLS.sepia);
	let invertColors = $state(DEFAULT_CONTROLS.invertColors);
	let thresholding = $state(DEFAULT_CONTROLS.thresholding);
	let sharpness = $state(DEFAULT_CONTROLS.sharpness);
	let edgeDetection = $state(DEFAULT_CONTROLS.edgeDetection);
	let spaceDensity = $state(DEFAULT_CONTROLS.spaceDensity);
	let selectedGradient = $state<GradientName>(DEFAULT_CONTROLS.selectedGradient);
	let ditheringMethod = $state<DitheringName>(DEFAULT_CONTROLS.ditheringMethod);
	let animationFrameLimit = $state(DEFAULT_CONTROLS.animationFrameLimit);
	let animationFrameSkip = $state(DEFAULT_CONTROLS.animationFrameSkip);
	let animationPlaybackSpeed = $state(DEFAULT_CONTROLS.animationPlaybackSpeed);

	const isDifferent = (current: number, initial: number) => Math.abs(current - initial) > FLOAT_TOLERANCE;

	const hasImage = $derived(Boolean(imageUrl));
	const hasAdjustments = $derived(
		hasImage &&
		(
			isDifferent(characters, DEFAULT_CONTROLS.characters) ||
			isDifferent(brightness, DEFAULT_CONTROLS.brightness) ||
			isDifferent(contrast, DEFAULT_CONTROLS.contrast) ||
			isDifferent(saturation, DEFAULT_CONTROLS.saturation) ||
			isDifferent(hue, DEFAULT_CONTROLS.hue) ||
			isDifferent(grayscale, DEFAULT_CONTROLS.grayscale) ||
			isDifferent(sepia, DEFAULT_CONTROLS.sepia) ||
			isDifferent(invertColors, DEFAULT_CONTROLS.invertColors) ||
			isDifferent(thresholding, DEFAULT_CONTROLS.thresholding) ||
			isDifferent(sharpness, DEFAULT_CONTROLS.sharpness) ||
			isDifferent(edgeDetection, DEFAULT_CONTROLS.edgeDetection) ||
			isDifferent(spaceDensity, DEFAULT_CONTROLS.spaceDensity) ||
			selectedGradient !== DEFAULT_CONTROLS.selectedGradient ||
			ditheringMethod !== DEFAULT_CONTROLS.ditheringMethod ||
			isDifferent(animationFrameLimit, DEFAULT_CONTROLS.animationFrameLimit) ||
			isDifferent(animationFrameSkip, DEFAULT_CONTROLS.animationFrameSkip) ||
			isDifferent(animationPlaybackSpeed, DEFAULT_CONTROLS.animationPlaybackSpeed)
		)
	);

	const getControlsSnapshot = () => ({
		characters,
		brightness,
		contrast,
		saturation,
		hue,
		grayscale,
		sepia,
		invertColors,
		thresholding,
		sharpness,
		edgeDetection,
		spaceDensity,
		selectedGradient,
		ditheringMethod,
		animationFrameLimit,
		animationFrameSkip,
		animationPlaybackSpeed
	}) satisfies ControlState;

	const getExportBgOpacity = () => getOpacityFromPercent(exportBgAlpha);
	const getExportBgColor = () => getRgbaColor(exportBgHex, exportBgAlpha);
	const isExportBgTransparent = () => getExportBgOpacity() <= 0;

	const applyTheme = (nextTheme: Theme) => {
		if (typeof document === 'undefined') return;
		document.body.className = nextTheme;
	};

	let activeObjectUrl: string | null = null;
	let conversionId = 0;
	let transparencyCheckId = 0;
	let animationDetectionId = 0;
	let dragDepth = 0;

	onMount(() => {
		if (typeof document === 'undefined') return;
		const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? 'dark';
		theme = storedTheme;
		applyTheme(storedTheme);
			console.clear(); // shhhhhh
	        console.log('Hello Fellow Dev! ಠ‿↼');
	});

	onDestroy(() => {
		if (activeObjectUrl) {
			URL.revokeObjectURL(activeObjectUrl);
		}
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		applyTheme(theme);
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		}
	}

	$effect(() => {
		const safeHex = sanitizeHexColor(exportBgHex);
		if (safeHex !== exportBgHex) {
			exportBgHex = safeHex;
		}
	});

	$effect(() => {
		const clampedAlpha = clampPercentage(exportBgAlpha);
		if (clampedAlpha !== exportBgAlpha) {
			exportBgAlpha = clampedAlpha;
		}
	});

	async function handleFileSelection(file: File | null) {
		if (activeObjectUrl) {
			URL.revokeObjectURL(activeObjectUrl);
			activeObjectUrl = null;
		}

		imageHasTransparency = false;
		isAnimatedImage = false;
		animationFormat = 'none';
		asciiFrames = [];
		asciiOutput = '';
		currentFile = file;
		isProcessing = Boolean(file);
		errorMessage = '';
		hasError = false;

		if (!file) {
			imageUrl = '';
			asciiOutput = '';
			imageName = '';
			isAnimationDetectionPending = false;
			return;
		}

		if (!file.type.startsWith('image/')) {
			errorMessage = 'Invalid file format. Please upload a valid image file.';
			hasError = true;
			isProcessing = false;
			return;
		}

		isAnimationDetectionPending = true;
		const nextUrl = URL.createObjectURL(file);
		activeObjectUrl = nextUrl;
		imageUrl = nextUrl;
		imageName = file.name;

		const currentCheckId = ++transparencyCheckId;
		const currentDetectionId = ++animationDetectionId;
		try {
			const format = await detectAnimatedFormat(file);
			if (currentDetectionId === animationDetectionId) {
				animationFormat = format;
				isAnimatedImage = format !== 'none';
			}
		} catch (error) {
			console.warn('Unable to detect animation format', error);
			if (currentDetectionId === animationDetectionId) {
				animationFormat = 'none';
				isAnimatedImage = false;
				errorMessage = 'Failed to process animation. The file may be corrupted or in an unsupported format.';
				hasError = true;
				isProcessing = false;
			}
		} finally {
			if (currentDetectionId === animationDetectionId) {
				isAnimationDetectionPending = false;
			}
		}

		try {
			const hasTransparency = await detectImageTransparency(file, nextUrl);
			if (currentCheckId === transparencyCheckId) {
				imageHasTransparency = hasTransparency;
			}
		} catch (error) {
			console.warn('Unable to detect transparency', error);
			if (currentCheckId === transparencyCheckId) {
				imageHasTransparency = false;
			}
		}
	}

	async function runConversion() {
		if (!imageUrl || isAnimationDetectionPending) return;
		const currentId = ++conversionId;
		isProcessing = true;

		try {
			const { asciiOutput: ascii, asciiFrames: frames } = await convertSourceToAscii({
				imageUrl,
				controls: getControlsSnapshot(),
				animation: {
					isAnimatedImage,
					format: animationFormat,
					file: currentFile
				}
			});

			if (currentId === conversionId) {
				asciiOutput = ascii;
				asciiFrames = frames;
				hasError = false;
				errorMessage = '';
			}
		} catch (error) {
			console.error('Error converting image:', error);
			if (currentId === conversionId) {
				errorMessage =
					error instanceof Error
						? error.message
						: 'Failed to load or convert the image. The file may be corrupted or unsupported.';
				hasError = true;
			}
		} finally {
			if (currentId === conversionId) {
				isProcessing = false;
			}
		}
	}

	$effect(() => {
		if (!imageUrl) return;
		void characters;
		void brightness;
		void contrast;
		void saturation;
		void hue;
		void grayscale;
		void sepia;
		void invertColors;
		void thresholding;
		void sharpness;
		void edgeDetection;
		void spaceDensity;
		void selectedGradient;
		void ditheringMethod;
		void isAnimatedImage;
		void animationFormat;
		void animationFrameLimit;
		void animationFrameSkip;
		void animationPlaybackSpeed;
		void isAnimationDetectionPending;
		runConversion();
	});

	function handleCopy() {
		copyAsciiToClipboard();
	}

	function handleDownloadTxt() {
		if (!asciiOutput) return;
		downloadAsciiText(asciiOutput, imageName);
	}

	function handleDownloadSvg() {
		if (!asciiOutput) return;
		downloadSvg(asciiOutput, theme, { transparentBackground: exportTransparent, filename: imageName });
	}

	function handleDownloadPng() {
		if (!asciiOutput) return;
		const transparentBackground = isExportBgTransparent();
		const backgroundColor = transparentBackground ? undefined : getExportBgColor();
		downloadPng(asciiOutput, theme, {
			transparentBackground,
			backgroundColor,
			filename: imageName
		});
	}

	function handleDownloadWebp() {
		if (!asciiOutput) return;
		const transparentBackground = isExportBgTransparent();
		const backgroundColor = transparentBackground ? undefined : getExportBgColor();
		downloadWebp(asciiOutput, theme, {
			transparentBackground,
			backgroundColor,
			filename: imageName
		});
	}

	function handleDownloadGif() {
		if (!asciiFrames || asciiFrames.length === 0) return;
		const transparentBackground = isExportBgTransparent();
		const backgroundColor = transparentBackground ? undefined : getExportBgColor();
		void downloadGif(asciiFrames, theme, {
			transparentBackground,
			backgroundColor,
			filename: imageName
		});
	}

	function handleDownloadApng() {
		if (!asciiFrames || asciiFrames.length === 0) return;
		const transparentBackground = isExportBgTransparent();
		const backgroundColor = transparentBackground ? undefined : getExportBgColor();
		void downloadApng(asciiFrames, theme, {
			transparentBackground,
			backgroundColor,
			filename: imageName
		});
	}

	function handleExportAnimation() {
		if (!asciiFrames || asciiFrames.length === 0) return;
		const filename = imageName ? `${imageName.replace(/\.[^/.]+$/, '')}-animation.json` : 'ascii-animation.json';
		void downloadAnimationJson(asciiFrames, filename);
	}

	function handleOutputDownload(event: CustomEvent<{ type: DownloadType }>) {
		if (!asciiOutput) return;
		switch (event.detail.type) {
			case 'txt':
				handleDownloadTxt();
				break;
			case 'svg':
				handleDownloadSvg();
				break;
			case 'png':
				handleDownloadPng();
				break;
			case 'webp':
				handleDownloadWebp();
				break;
			case 'gif':
				handleDownloadGif();
				break;
			case 'apng':
				handleDownloadApng();
				break;
			default:
				break;
		}
	}

	function resetControls() {
		characters = DEFAULT_CONTROLS.characters;
		brightness = DEFAULT_CONTROLS.brightness;
		contrast = DEFAULT_CONTROLS.contrast;
		saturation = DEFAULT_CONTROLS.saturation;
		hue = DEFAULT_CONTROLS.hue;
		grayscale = DEFAULT_CONTROLS.grayscale;
		sepia = DEFAULT_CONTROLS.sepia;
		invertColors = DEFAULT_CONTROLS.invertColors;
		thresholding = DEFAULT_CONTROLS.thresholding;
		sharpness = DEFAULT_CONTROLS.sharpness;
		edgeDetection = DEFAULT_CONTROLS.edgeDetection;
		spaceDensity = DEFAULT_CONTROLS.spaceDensity;
		selectedGradient = DEFAULT_CONTROLS.selectedGradient;
		ditheringMethod = DEFAULT_CONTROLS.ditheringMethod;
		animationFrameLimit = DEFAULT_CONTROLS.animationFrameLimit;
		animationFrameSkip = DEFAULT_CONTROLS.animationFrameSkip;
		animationPlaybackSpeed = DEFAULT_CONTROLS.animationPlaybackSpeed;
	}

	function isFileDrag(event: DragEvent) {
		return Array.from(event.dataTransfer?.types ?? []).includes('Files');
	}

	function preventDragDefaults(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	function handleDragEnter(event: DragEvent) {
		if (!isFileDrag(event)) return;
		preventDragDefaults(event);
		dragDepth += 1;
		isDragActive = true;
	}

	function handleDragOver(event: DragEvent) {
		if (!isFileDrag(event)) return;
		preventDragDefaults(event);
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	function handleDragLeave(event: DragEvent) {
		if (!isFileDrag(event)) return;
		preventDragDefaults(event);
		dragDepth = Math.max(0, dragDepth - 1);
		if (dragDepth === 0) {
			isDragActive = false;
		}
	}

	function handleDrop(event: DragEvent) {
		if (!isFileDrag(event)) return;
		preventDragDefaults(event);
		isDragActive = false;
		dragDepth = 0;
		const file = event.dataTransfer?.files?.[0] ?? null;
		void handleFileSelection(file);
	}

</script>

<div
	class="page-shell"
	role="region"
	aria-label="Image upload workspace"
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	{#if isDragActive}
		<div class="drop-overlay" aria-live="polite">
			<p>Drop your image to convert</p>
			<small>PNG, JPG, GIF, SVG, WEBP...</small>
		</div>
	{/if}

	<header>
		<h1 class="site-title" aria-label="askey">
			<span class="title-layer title-base">asꄗ</span>
			<span class="title-layer title-hover" aria-hidden="true">askey</span>
		</h1>
		<button class="theme-toggle" type="button" onclick={toggleTheme} aria-label="Toggle theme">
			{theme === 'dark' ? '☼' : '☾'}
		</button>
	</header>

	{#if hasError && errorMessage}
		<div class="error-message" role="alert" aria-live="assertive" transition:slide={{ duration: 300 }}>
			<span class="error-icon">⚠</span>
			<p>{errorMessage}</p>
		</div>
	{/if}

	<div class="main-content">
		<!-- For later I need to research more about dithering -->
		<!-- bind:ditheringMethod -->
		<!-- bind:spaceDensity -->
		<ControlsPanel
			hasImage={hasImage}
			hasAdjustments={hasAdjustments}
			hasError={hasError}
			selectedFileName={imageName}
			dragActive={isDragActive}
			isAnimatedImage={isAnimatedImage}
			bind:characters
			bind:brightness
			bind:contrast
			bind:saturation
			bind:hue
			bind:grayscale
			bind:sepia
			bind:invertColors
			bind:thresholding
			bind:sharpness
			bind:edgeDetection
			bind:selectedGradient
			bind:animationFrameLimit
			bind:animationFrameSkip
			bind:animationPlaybackSpeed
			on:fileSelect={(event: { detail: File | null; }) => void handleFileSelection(event.detail)}
			on:reset={resetControls}
		>
			<svelte:fragment slot="actions">
				<div class="actions-bar">
					<ActionButtons
						disabled={!asciiOutput}
						isAnimated={isAnimatedImage}
						on:copy={handleCopy}
						on:downloadTxt={handleDownloadTxt}
						on:downloadSvg={handleDownloadSvg}
						on:downloadPng={handleDownloadPng}
						on:downloadWebp={handleDownloadWebp}
						on:downloadGif={handleDownloadGif}
						on:downloadApng={handleDownloadApng}
						on:exportAnimation={handleExportAnimation}
					/>
					{#if imageHasTransparency}
						<div class="export-options">
							<ColorPicker
								id="export-color"
								label="Background Color"
								alphaLabel="Opacity"
								bind:color={exportBgHex}
								bind:alpha={exportBgAlpha}
							/>
							<label class="export-toggle">
								<input 
									type="checkbox" 
									checked={exportTransparent}
									onchange={(e: Event) => {
										const target = e.target as HTMLInputElement;
										exportTransparent = target.checked;
										if (target.checked) {
											exportBgAlpha = 0;
										} else {
											exportBgAlpha = 100;
										}
									}}
								/>
								<span>Transparent background</span>
							</label>
						</div>
					{/if}
				</div>
			</svelte:fragment>
		</ControlsPanel>

		<OutputPanel 
			{isProcessing} 
			{asciiOutput} 
			{isAnimatedImage} 
			{imageUrl} 
			{asciiFrames}
			on:download={handleOutputDownload}
			on:export={handleExportAnimation}
		/>
	</div>

	<Footer />
</div>

