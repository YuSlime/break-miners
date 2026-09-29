import { createDefaultSave, parseSaveData, SAVE_VERSION } from "./SaveSchema";
import type { SaveParseResult } from "./saveTypes";

export function migrateSave(value: unknown): SaveParseResult {
  if (typeof value !== "object" || value === null) return parseSaveData(value);
  const source = value as Record<string, unknown>;
  if (source.version === SAVE_VERSION) return parseSaveData(source);
  if (source.version === 0) {
    const defaults = createDefaultSave();
    return parseSaveData({
      ...defaults,
      ...source,
      version: SAVE_VERSION,
      settings: { ...defaults.settings, ...(source.settings as object ?? {}) },
      recentDrops: [],
      completedRuns: 0,
    });
  }
  return parseSaveData(value);
}
