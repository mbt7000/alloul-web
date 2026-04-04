import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { darkColors, lightColors, type AppPalette, type ThemeMode } from "./palettes";

const STORAGE_KEY = "@alloul/theme_mode";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: AppPalette;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyNativeScheme(m: ThemeMode) {
  try {
    Appearance.setColorScheme(m === "light" ? "light" : "dark");
  } catch {
    /* */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let on = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!on) return;
        if (raw === "light" || raw === "dark") {
          setModeState(raw);
          applyNativeScheme(raw);
        }
      } catch {
        /* ignore */
      } finally {
        if (on) setHydrated(true);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
    applyNativeScheme(m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      applyNativeScheme(next);
      return next;
    });
  }, []);

  const colors = useMemo(() => (mode === "light" ? lightColors : darkColors), [mode]);

  const value = useMemo(
    () => ({ mode, colors, setMode, toggleMode }),
    [mode, colors, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useAppThemeSafe(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    mode: "dark",
    colors: darkColors,
    setMode: () => {},
    toggleMode: () => {},
  };
}
