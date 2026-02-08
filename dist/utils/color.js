/**
 * Centralized Color Utilities
 *
 * Single source of truth for color normalization, conversion, and detection.
 * Use these functions throughout the codebase to ensure consistency.
 */
/**
 * Normalize a color to Figma's 0-1 range.
 * Accepts both 0-255 and 0-1 ranges and normalizes to 0-1.
 */
export function normalizeColor(color) {
    const normalize = (v) => {
        if (v > 1) {
            return v / 255;
        }
        return v;
    };
    return {
        r: normalize(color.r),
        g: normalize(color.g),
        b: normalize(color.b),
    };
}
/**
 * Convert RGB to hex string.
 * Handles both 0-1 and 0-255 ranges automatically.
 */
export function rgbToHex(r, g, b) {
    const toHex = (v) => {
        // If value is in 0-1 range, convert to 0-255
        const val = v <= 1 ? Math.round(v * 255) : Math.round(v);
        return Math.max(0, Math.min(255, val)).toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
/**
 * Convert hex string to RGB (0-1 range for Figma).
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
        return null;
    }
    return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
    };
}
/**
 * Detect if a color is gray (R ≈ G ≈ B).
 * This is the CORRECT way to detect grays - not using regex on hex strings.
 *
 * @param hex - Hex color string (e.g., "#808080")
 * @param tolerance - Maximum difference between R, G, B values (default 25)
 * @returns true if the color is gray
 */
export function isGrayColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return false;
    }
    // Convert to 0-255 range for easier comparison
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    // Gray colors have R ≈ G ≈ B
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    // Tolerance of 25 allows for slight variations while still detecting grays
    return maxDiff < 25;
}
/**
 * Detect if a color is a likely placeholder/wireframe color.
 * These are typically mid-to-light grays used for mockups.
 *
 * @param hex - Hex color string
 * @returns true if the color looks like a wireframe placeholder
 */
export function isWireframePlaceholderColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return false;
    }
    // Convert to 0-255 range
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    // Check if it's gray
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    const isGray = maxDiff < 25;
    if (!isGray) {
        return false;
    }
    // Check if it's in the typical wireframe gray range (mid-to-light gray)
    // Common wireframe grays: #808080, #A0A0A0, #C0C0C0, #D0D0D0, #E0E0E0, #F0F0F0
    const avgBrightness = (r + g + b) / 3;
    // Wireframe placeholders are typically between 40% and 95% brightness
    // Excludes very dark grays (likely text) and pure white (backgrounds)
    return avgBrightness >= 100 && avgBrightness <= 240;
}
/**
 * Calculate the brightness of a color (0-1 scale).
 */
export function colorBrightness(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return 0;
    }
    // Using relative luminance formula
    return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}
/**
 * Check if two colors are similar within a tolerance.
 */
export function colorsAreSimilar(hex1, hex2, tolerance = 0.1) {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) {
        return false;
    }
    const diff = Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2));
    return diff < tolerance;
}
