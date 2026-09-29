import {
  PERMANENT_UPGRADES,
  type PermanentUpgradeId,
} from "../data/permanentUpgrades";
import type {
  DropHistoryEntry,
  QualitySetting,
  SaveData,
  SaveParseResult,
  SettingsData,
} from "./saveTypes";

export const SAVE_VERSION = 1 as const;

const DEFAULT_SETTINGS: Readonly<SettingsData> = Object.freeze({
  musicVolume: 0.7,
  sfxVolume: 0.8,
  quality: "AUTO",
  reducedMotion: false,
  screenFlash: true,
  cameraShakePercent: 100,
});

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    credits: 0,
    coreShards: 0,
    completedRuns: 0,
    upgrades: {},
    records: { deepestMeters: 0, bestCombo: 0, mostBlocksBroken: 0 },
    settings: { ...DEFAULT_SETTINGS },
    recentDrops: [],
  };
}

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function integer(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function unit(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

export function parseSaveData(value: unknown): SaveParseResult {
  const source = object(value);
  if (!source || source.version !== SAVE_VERSION) {
    return { valid: false, data: createDefaultSave(), warnings: ["INVALID_ROOT"] };
  }
  const warnings: string[] = [];
  const upgradeSource = object(source.upgrades) ?? {};
  const upgrades: SaveData["upgrades"] = {};
  (Object.keys(PERMANENT_UPGRADES) as PermanentUpgradeId[]).forEach((id) => {
    const raw = upgradeSource[id];
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return;
    const normalized = Math.min(PERMANENT_UPGRADES[id].maxLevel, Math.floor(raw));
    if (normalized > 0) upgrades[id] = normalized;
  });
  const recordSource = object(source.records) ?? {};
  const settingsSource = object(source.settings) ?? {};
  const qualityOptions: readonly QualitySetting[] = ["AUTO", "LOW", "MEDIUM", "HIGH"];
  const quality = qualityOptions.includes(settingsSource.quality as QualitySetting)
    ? (settingsSource.quality as QualitySetting)
    : DEFAULT_SETTINGS.quality;
  const seenDrops = new Set<string>();
  const recentDrops: DropHistoryEntry[] = [];
  if (Array.isArray(source.recentDrops)) {
    for (const raw of source.recentDrops.slice(0, 100)) {
      const drop = object(raw);
      if (!drop || typeof drop.id !== "string" || seenDrops.has(drop.id)) continue;
      if (typeof drop.name !== "string" || typeof drop.rarity !== "string") continue;
      seenDrops.add(drop.id);
      recentDrops.push({
        id: drop.id.slice(0, 100),
        name: drop.name.slice(0, 100),
        rarity: drop.rarity.slice(0, 30),
        foundAt: integer(drop.foundAt),
      });
      if (recentDrops.length >= 50) break;
    }
  }
  const data: SaveData = {
    version: SAVE_VERSION,
    credits: integer(source.credits),
    coreShards: integer(source.coreShards),
    completedRuns: integer(source.completedRuns),
    upgrades,
    records: {
      deepestMeters: integer(recordSource.deepestMeters),
      bestCombo: integer(recordSource.bestCombo),
      mostBlocksBroken: integer(recordSource.mostBlocksBroken),
    },
    settings: {
      musicVolume: unit(settingsSource.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: unit(settingsSource.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
      quality,
      reducedMotion:
        typeof settingsSource.reducedMotion === "boolean"
          ? settingsSource.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
      screenFlash:
        typeof settingsSource.screenFlash === "boolean"
          ? settingsSource.screenFlash
          : DEFAULT_SETTINGS.screenFlash,
      cameraShakePercent: Math.min(100, integer(settingsSource.cameraShakePercent, 100)),
    },
    recentDrops,
  };
  return { valid: true, data, warnings };
}
