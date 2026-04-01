import { colors } from "./colors";
import { radii } from "./radii";

export const glass = {
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
  // Intended for top bars / overlays where density is higher
  chrome: {
    backgroundColor: "rgba(11,17,27,0.72)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: radii.xl,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 999,
  },
};
