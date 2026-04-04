/**
 * Static dark palette — prefer `useAppTheme().colors` in components for theme support.
 * Kept for rare non-React modules; defaults to dark.
 */
import { darkColors } from "./palettes";

export const colors = darkColors;

export { darkColors, lightColors, gradients, type AppPalette, type ThemeMode } from "./palettes";
