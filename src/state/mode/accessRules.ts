import type { HomeAppMode } from "./HomeModeContext";

export function canEnterMode(_mode: HomeAppMode, opts: { canUseCompanyMode: boolean }): boolean {
  return opts.canUseCompanyMode;
}

export function resolveAllowedMode(_preferred: HomeAppMode, _opts: { canUseCompanyMode: boolean }): HomeAppMode {
  return "company";
}
