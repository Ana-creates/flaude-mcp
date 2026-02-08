/**
 * Centralized Color Utilities
 *
 * Single source of truth for color normalization, conversion, and detection.
 * Use these functions throughout the codebase to ensure consistency.
 */
export interface RGBColor {
    r: number;
    g: number;
    b: number;
}
export interface RGBAColor extends RGBColor {
    a?: number;
}
/**
 * Normalize a color to Figma's 0-1 range.
 * Accepts both 0-255 and 0-1 ranges and normalizes to 0-1.
 */
export declare function normalizeColor(color: RGBColor): RGBColor;
/**
 * Convert RGB to hex string.
 * Handles both 0-1 and 0-255 ranges automatically.
 */
export declare function rgbToHex(r: number, g: number, b: number): string;
/**
 * Convert hex string to RGB (0-1 range for Figma).
 */
export declare function hexToRgb(hex: string): RGBColor | null;
/**
 * Detect if a color is gray (R ≈ G ≈ B).
 * This is the CORRECT way to detect grays - not using regex on hex strings.
 *
 * @param hex - Hex color string (e.g., "#808080")
 * @param tolerance - Maximum difference between R, G, B values (default 25)
 * @returns true if the color is gray
 */
export declare function isGrayColor(hex: string): boolean;
/**
 * Detect if a color is a likely placeholder/wireframe color.
 * These are typically mid-to-light grays used for mockups.
 *
 * @param hex - Hex color string
 * @returns true if the color looks like a wireframe placeholder
 */
export declare function isWireframePlaceholderColor(hex: string): boolean;
/**
 * Calculate the brightness of a color (0-1 scale).
 */
export declare function colorBrightness(hex: string): number;
/**
 * Check if two colors are similar within a tolerance.
 */
export declare function colorsAreSimilar(hex1: string, hex2: string, tolerance?: number): boolean;
