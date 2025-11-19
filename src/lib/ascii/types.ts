import type { DitheringName, GradientName } from './constants';

export interface ParsedAsciiToken {
	char: string;
	color: string;
}

export type ParsedAsciiLine = ParsedAsciiToken[];

export interface AsciiRenderData {
	lines: ParsedAsciiLine[];
	charWidth: number;
	lineHeight: number;
	fontSize: number;
	fontFamily: string;
	width: number;
	height: number;
	background: string;
}

export interface AsciiControlValues {
	characters: number;
	brightness: number;
	contrast: number;
	saturation: number;
	hue: number;
	grayscale: number;
	sepia: number;
	invertColors: number;
	thresholding: number;
	sharpness: number;
	edgeDetection: number;
	spaceDensity: number;
	selectedGradient: GradientName;
	ditheringMethod: DitheringName;
}

export interface SvgBuildParams {
	asciiOutput: string;
	theme: string;
	outputElementId?: string;
	transparentBackground?: boolean;
	backgroundColor?: string;
}
