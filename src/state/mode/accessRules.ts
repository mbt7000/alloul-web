import type { HomeAppMode } from "./HomeModeContext";

export function canEnterMode(mode: HomeAppMode, opts: { canUseCompanyMode: boolean }): boolean {
  if (mode === "company") return opts.canUseCompanyMode;
  return true;
}

export function resolveAllowedMode(preferred: HomeAppMode, opts: { canUseCompanyMode: boolean }): HomeAppMode {
  return canEnterMode(preferred, opts) ? preferred : "public";
}
