import type { UpgradeId } from "../data/upgrades";
import type { UpgradeChoice } from "../upgrades/UpgradeManager";
import type { RunResult } from "../run/resultTypes";

export type GamePhase =
  | "BOOT"
  | "MENU"
  | "RUNNING"
  | "LEVEL_UP"
  | "PAUSED"
  | "RESULT";

export interface Vec2 {
  x: number;
  y: number;
}

export interface InputSnapshot {
  moveX: number;
  moveY: number;
  abilityPressed: boolean;
}

export interface UISnapshot {
  phase: GamePhase;
  depthMeters: number;
  timeRemainingSeconds: number;
  level: number;
  xp: number;
  xpRequired: number;
  runCoins: number;
  coreShards: number;
  combo: number;
  breakGauge: number;
  breakTimeRemainingSeconds: number;
  upgradeChoices: readonly UpgradeChoice[];
  rerollsRemaining: number;
  result: Readonly<RunResult> | null;
}

export type GameCommand =
  | { type: "START_RUN"; seed?: number | string }
  | { type: "SET_INPUT"; input: InputSnapshot }
  | { type: "SELECT_UPGRADE"; upgradeId: UpgradeId }
  | { type: "REROLL_UPGRADES" }
  | { type: "SKIP_UPGRADE" }
  | { type: "PLAY_AGAIN" }
  | { type: "GO_HOME" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "END_RUN" };

export type VisualEvent =
  | { type: "BLOCK_HIT"; position: Vec2; critical: boolean }
  | { type: "BLOCK_BREAK"; position: Vec2; color: number }
  | { type: "EXPLOSION"; position: Vec2; radius: number }
  | { type: "LIGHTNING"; points: readonly Vec2[] }
  | { type: "COMBO_MILESTONE"; combo: number }
  | { type: "BREAK_TIME_START" }
  | { type: "BREAK_TIME_END" }
  | { type: "CORE_GATE_DESTROYED"; position: Vec2 };
