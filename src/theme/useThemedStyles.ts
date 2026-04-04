import { useMemo, useRef } from "react";
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import type { AppPalette } from "./palettes";
import { useAppTheme } from "./ThemeContext";

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Build StyleSheet from current palette; recomputes when light/dark changes.
 */
export function useThemedStyles<T extends NamedStyles>(factory: (colors: AppPalette) => T): T {
  const { colors } = useAppTheme();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  return useMemo(() => StyleSheet.create(factoryRef.current(colors) as T), [colors]);
}
