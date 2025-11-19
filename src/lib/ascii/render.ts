import type { AsciiRenderData, ParsedAsciiLine, SvgBuildParams } from './types';

export function buildSvgContent({
	asciiOutput,
	theme,
	outputElementId = 'ascii-output',
	transparentBackground = false,
	backgroundColor
}: SvgBuildParams): { svg: string; width: number; height: number } | null {
	const renderData = getAsciiRenderData(asciiOutput, theme, outputElementId);
	if (!renderData) return null;

	const { lines, charWidth, lineHeight, fontSize, fontFamily, width, height, background } =
		renderData;
	const fillColor = backgroundColor ?? background;
	const shouldRenderBackground = !transparentBackground && Boolean(fillColor);
	const backgroundRect = shouldRenderBackground
		? `\n<rect width="${width}" height="${height}" fill="${fillColor}"/>`
		: '';
	let svgContent =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">` +
		backgroundRect +
		'\n<style>\ntext {\n\tfont-family: ' +
		`${fontFamily};\n\tfont-size: ${fontSize}px;\n\tfont-weight: 400;\n\twhite-space: pre;\n}\n</style>`;

	lines.forEach((line, row) => {
		line.forEach((token, column) => {
			if (!token.char || token.char === ' ') return;
			svgContent += `\n<text x="${column * charWidth}" y="${row * lineHeight}" dominant-baseline="hanging" fill="${token.color}">${escapeForSvg(token.char)}</text>`;
		});
	});

	svgContent += '\n</svg>';
	return { svg: svgContent, width, height };
}

function getAsciiRenderData(
	asciiOutput: string,
	theme: string,
	outputElementId: string
): AsciiRenderData | null {
	if (!asciiOutput) return null;
	if (typeof document === 'undefined') return null;

	const defaultTextColor = theme === 'dark' ? '#f6f6f6' : '#000000';
	const rawLines = asciiOutput.split('\n');
	const parsedLines: ParsedAsciiLine[] = rawLines.map((line) => parseLine(line, defaultTextColor));
	const maxLineLength = parsedLines.reduce((max, line) => Math.max(max, line.length), 0);
	const lineCount = parsedLines.length;
	if (maxLineLength === 0 || lineCount === 0) return null;

	let fontSize = 10;
	let fontFamily = "'Inconsolata', monospace";
	let charWidth = 6;
	let lineHeight = fontSize;
	let background = theme === 'dark' ? '#000000' : '#f6f6f6';

	const outputElement = document.getElementById(outputElementId) as HTMLElement | null;
	if (outputElement) {
		const computed = getComputedStyle(outputElement);
		fontSize = parseFloat(computed.fontSize) || fontSize;
		fontFamily = computed.fontFamily || fontFamily;
		const paddingX =
			(parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
		const paddingY =
			(parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
		const measuredWidth = Math.max(
			0,
			(outputElement.scrollWidth || outputElement.clientWidth || 0) - paddingX
		);
		const measuredHeight = Math.max(
			0,
			(outputElement.scrollHeight || outputElement.clientHeight || 0) - paddingY
		);

		if (measuredWidth > 0) {
			charWidth = measuredWidth / maxLineLength;
		}

		if (measuredHeight > 0) {
			lineHeight = measuredHeight / lineCount;
		} else {
			const rawLineHeight =
				computed.lineHeight === 'normal' ? Number.NaN : parseFloat(computed.lineHeight);
			lineHeight = !Number.isNaN(rawLineHeight) ? rawLineHeight : fontSize;
		}

		if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
			background = computed.backgroundColor;
		}
	}

	const width = Math.max(charWidth * maxLineLength, 1);
	const height = Math.max(lineHeight * lineCount, 1);

	return {
		lines: parsedLines,
		charWidth,
		lineHeight,
		fontSize,
		fontFamily,
		width,
		height,
		background
	};
}

function parseLine(line: string, defaultColor: string): ParsedAsciiLine {
	const temp = document.createElement('div');
	temp.innerHTML = line;
	const spans = temp.querySelectorAll('span');
	if (!spans.length) return [];

	return Array.from(spans).map((span) => ({
		char: span.textContent ?? ' ',
		color: span.style.color || defaultColor
	}));
}

function escapeForSvg(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
