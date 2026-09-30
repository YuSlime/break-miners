import type { RunBuild } from "../upgrades/UpgradeManager";
import type {
  BlockBreakSummary,
  CoreDestroyedSummary,
  RecordChange,
  RunRecords,
  RunResult,
} from "./resultTypes";

export interface RunSystemOptions {
  durationSeconds: number;
  seed: number | string;
  firstCompletedRun?: boolean;
  records?: Readonly<RunRecords>;
  build?: Readonly<RunBuild>;
}

export interface RunStepResult {
  ended: boolean;
  timeRemainingSeconds: number;
}

const EMPTY_RECORDS: Readonly<RunRecords> = Object.freeze({
  deepestMeters: 0,
  bestCombo: 0,
  mostBlocksBroken: 0,
});

export function creditsFromRunCoins(runCoins: number): number {
  return Math.max(0, Math.floor(runCoins / 10));
}

export class RunSystem {
  readonly #seed: number | string;
  readonly #firstCompletedRun: boolean;
  readonly #records: Readonly<RunRecords>;
  #build: Readonly<RunBuild>;
  #timeRemainingSeconds: number;
  #depthMeters = 0;
  #blocksBroken = 0;
  #bestCombo = 0;
  #runCoins = 0;
  #coreShards = 0;
  #geodes = 0;
  readonly #destroyedCoreDepths = new Set<number>();
  #result: Readonly<RunResult> | undefined;

  constructor(options: RunSystemOptions) {
    this.#seed = options.seed;
    this.#firstCompletedRun = options.firstCompletedRun ?? false;
    this.#records = { ...(options.records ?? EMPTY_RECORDS) };
    this.#build = Object.freeze({ ...(options.build ?? {}) });
    this.#timeRemainingSeconds = Math.max(0, options.durationSeconds);
  }

  step(dt: number): RunStepResult {
    if (this.#result) return { ended: true, timeRemainingSeconds: 0 };
    const remaining = this.#timeRemainingSeconds - Math.max(0, dt);
    this.#timeRemainingSeconds = remaining <= 1e-9 ? 0 : remaining;
    return {
      ended: this.#timeRemainingSeconds === 0,
      timeRemainingSeconds: this.#timeRemainingSeconds,
    };
  }

  setDepth(depthMeters: number): void {
    if (this.#result) return;
    this.#depthMeters = Math.max(this.#depthMeters, Math.floor(depthMeters));
  }

  setBuild(build: Readonly<RunBuild>): void {
    if (this.#result) return;
    this.#build = Object.freeze({ ...build });
  }

  recordBlockBreak(event: BlockBreakSummary): void {
    if (this.#result) return;
    this.#blocksBroken += 1;
    this.#runCoins += Math.max(0, Math.floor(event.runCoins));
    this.#bestCombo = Math.max(this.#bestCombo, Math.floor(event.combo));
    if (event.type === "GEODE") this.#geodes += 1;
  }

  addRunCoins(amount: number): void {
    if (this.#result) return;
    this.#runCoins += Math.max(0, Math.floor(amount));
  }

  recordCoreDestroyed(event: CoreDestroyedSummary): boolean {
    if (this.#result || this.#destroyedCoreDepths.has(event.depthMeters)) return false;
    this.#destroyedCoreDepths.add(event.depthMeters);
    this.#coreShards += Math.max(0, Math.floor(event.coreShards));
    return true;
  }

  finish(reason: "TIMER" | "MANUAL"): Readonly<RunResult> {
    if (this.#result) return this.#result;
    const current: RunRecords = {
      deepestMeters: this.#depthMeters,
      bestCombo: this.#bestCombo,
      mostBlocksBroken: this.#blocksBroken,
    };
    const recordChanges: RecordChange[] = [];
    (Object.keys(current) as Array<keyof RunRecords>).forEach((record) => {
      if (current[record] > this.#records[record]) {
        recordChanges.push({
          record,
          previous: this.#records[record],
          current: current[record],
        });
      }
    });
    const converted = creditsFromRunCoins(this.#runCoins);
    this.#timeRemainingSeconds = 0;
    this.#result = Object.freeze({
      reason,
      seed: this.#seed,
      depthMeters: this.#depthMeters,
      blocksBroken: this.#blocksBroken,
      bestCombo: this.#bestCombo,
      runCoins: this.#runCoins,
      awardedCredits: this.#firstCompletedRun ? Math.max(10, converted) : converted,
      coreShards: this.#coreShards,
      geodes: this.#geodes,
      build: Object.freeze({ ...this.#build }),
      recordChanges: Object.freeze(
        recordChanges.map((change) => Object.freeze({ ...change })),
      ),
    });
    return this.#result;
  }
}
