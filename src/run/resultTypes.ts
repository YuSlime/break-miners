import type { UpgradeId } from "../data/upgrades";
import type { RunBuild } from "../upgrades/UpgradeManager";
import type { BlockType } from "../world/worldTypes";

export interface RunRecords {
  deepestMeters: number;
  bestCombo: number;
  mostBlocksBroken: number;
}

export type RunRecordKey = keyof RunRecords;

export interface RecordChange {
  record: RunRecordKey;
  previous: number;
  current: number;
}

export interface RunResult {
  reason: "TIMER" | "MANUAL";
  seed: number | string;
  depthMeters: number;
  blocksBroken: number;
  bestCombo: number;
  runCoins: number;
  awardedCredits: number;
  coreShards: number;
  geodes: number;
  build: Readonly<RunBuild>;
  recordChanges: readonly Readonly<RecordChange>[];
}

export interface BlockBreakSummary {
  type: BlockType;
  runCoins: number;
  combo: number;
}

export interface CoreDestroyedSummary {
  depthMeters: number;
  coreShards: number;
}

export type FrozenBuild = Readonly<Partial<Record<UpgradeId, number>>>;
