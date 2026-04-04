/** Shared token shape for dark / light */
export type AppPalette = {
  brandDeepBlue: string;
  brandSurface: string;
  brandNeonBlue: string;
  brandPrimaryBlue: string;
  bg: string;
  bgPureBlack: string;
  mediaCanvas: string;
  bgSurface: string;
  bgCard: string;
  bgCardStrong: string;
  cardElevated: string;
  floatingBarBg: string;
  floatingBarBorder: string;
  floatingActiveFill: string;
  floatingActiveBorder: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentCobalt: string;
  accentBlue: string;
  accentCyan: string;
  accentTeal: string;
  accentEmerald: string;
  accentLime: string;
  accentNeonGreen: string;
  accentEmber: string;
  accentRose: string;
  primary: string;
  accentNeon: string;
  surface: string;
  card: string;
  cardStrong: string;
  white: string;
  black: string;
  success: string;
  danger: string;
  warning: string;
};

export const darkColors: AppPalette = {
  brandDeepBlue: "#070A12",
  brandSurface: "#0B111B",
  brandNeonBlue: "#38E8FF",
  brandPrimaryBlue: "#4C6FFF",
  bg: "#070A12",
  bgPureBlack: "#000000",
  mediaCanvas: "#000000",
  bgSurface: "#0B111B",
  bgCard: "rgba(255,255,255,0.06)",
  bgCardStrong: "rgba(255,255,255,0.12)",
  cardElevated: "#1A1A1E",
  floatingBarBg: "rgba(32,32,34,0.96)",
  floatingBarBorder: "rgba(255,255,255,0.08)",
  floatingActiveFill: "#FFFFFF",
  floatingActiveBorder: "rgba(255,255,255,0.2)",
  border: "rgba(255,255,255,0.12)",
  textPrimary: "#F5F7FB",
  textSecondary: "#A8B3C7",
  textMuted: "#6C768A",
  accent: "#4C6FFF",
  accentCobalt: "#4C6FFF",
  accentBlue: "#4C6FFF",
  accentCyan: "#38E8FF",
  accentTeal: "#2DE2C7",
  accentEmerald: "#2DE2C7",
  accentLime: "#B7FF4F",
  accentNeonGreen: "#00E676",
  accentEmber: "#FF7A59",
  accentRose: "#FF5C7C",
  primary: "#4C6FFF",
  accentNeon: "#38E8FF",
  surface: "#0B111B",
  card: "rgba(255,255,255,0.06)",
  cardStrong: "rgba(255,255,255,0.12)",
  white: "#FFFFFF",
  black: "#000000",
  success: "#2DE2C7",
  danger: "#FF5C7C",
  warning: "#FFB24D",
};

export const lightColors: AppPalette = {
  brandDeepBlue: "#E8EDFF",
  brandSurface: "#F4F6FC",
  brandNeonBlue: "#0099CC",
  brandPrimaryBlue: "#3D5AFE",
  bg: "#F4F6FC",
  bgPureBlack: "#FFFFFF",
  mediaCanvas: "#FFFFFF",
  bgSurface: "#EEF1F8",
  bgCard: "rgba(0,0,0,0.04)",
  bgCardStrong: "rgba(0,0,0,0.07)",
  cardElevated: "#FFFFFF",
  floatingBarBg: "rgba(255,255,255,0.94)",
  floatingBarBorder: "rgba(61,90,254,0.18)",
  floatingActiveFill: "#3D5AFE",
  floatingActiveBorder: "rgba(61,90,254,0.35)",
  border: "rgba(0,0,0,0.08)",
  textPrimary: "#0D1118",
  textSecondary: "#4A5568",
  textMuted: "#718096",
  accent: "#3D5AFE",
  accentCobalt: "#3D5AFE",
  accentBlue: "#3D5AFE",
  accentCyan: "#0088A8",
  accentTeal: "#0D9488",
  accentEmerald: "#0D9488",
  accentLime: "#65A30D",
  accentNeonGreen: "#059669",
  accentEmber: "#EA580C",
  accentRose: "#E11D48",
  primary: "#3D5AFE",
  accentNeon: "#0088A8",
  surface: "#EEF1F8",
  card: "rgba(0,0,0,0.04)",
  cardStrong: "rgba(0,0,0,0.07)",
  white: "#FFFFFF",
  black: "#000000",
  success: "#0D9488",
  danger: "#E11D48",
  warning: "#D97706",
};

export const gradients = {
  accent: ["#4C6FFF", "#38E8FF"] as const,
  media: ["#4C6FFF", "#2DE2C7"] as const,
  workspace: ["#2DE2C7", "#B7FF4F"] as const,
  flare: ["#38E8FF", "#FF7A59"] as const,
};

export type ThemeMode = "light" | "dark";
