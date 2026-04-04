import type { AppPalette } from "./palettes";
import { lightColors } from "./palettes";
import { radii } from "./radii";

export function glassStyles(colors: AppPalette) {
  const isLight = colors.bg === lightColors.bg;
  return {
    card: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
    },
    cardStrong: {
      backgroundColor: colors.bgCardStrong,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.xl,
    },
    chrome: {
      backgroundColor: isLight ? "rgba(255,255,255,0.92)" : "rgba(11,17,27,0.72)",
      borderColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderRadius: radii.xl,
    },
    pill: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 999,
    },
  };
}
