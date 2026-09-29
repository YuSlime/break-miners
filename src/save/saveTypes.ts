import type { PermanentUpgradeId } from "../data/permanentUpgrades";
import type { RunRecords } from "../run/resultTypes";

export type QualitySetting = "AUTO" | "LOW" | "MEDIUM" | "HIGH";

export interface SettingsData {
  musicVolume: number;
  sfxVolume: number;
  quality: QualitySetting;
  reducedMotion: boolean;
  screenFlash: boolean;
  cameraShakePercent: number;
}

export interface DropHistoryEntry {
  id: string;
  name: string;
  rarity: string;
  foundAt: number;
}

export interface SaveDataV1 {
  version: 1;
  credits: number;
  coreShards: number;
  completedRuns: number;
  upgrades: Partial<Record<PermanentUpgradeId, number>>;
  records: RunRecords;
  settings: SettingsData;
  recentDrops: DropHistoryEntry[];
}

export type SaveData = SaveDataV1;

export interface SaveParseResult {
  valid: boolean;
  data: SaveData;
  warnings: readonly string[];
}
