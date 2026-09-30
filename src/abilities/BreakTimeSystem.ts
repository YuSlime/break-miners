import { BALANCE } from "../data/balance";
import type { BlockType } from "../world/worldTypes";

export interface BreakTimeState {
  gauge: number;
  active: boolean;
  remainingSeconds: number;
  started: boolean;
  ended: boolean;
}

export interface BreakTimeModifiers {
  miningSpeedMultiplier: number;
  moveSpeedMultiplier: number;
  explosionChanceBonus: number;
  rewardMultiplier: number;
}

function gaugeValue(type: BlockType): number {
  if (type === "GEODE" || type === "CORE_GATE") return 5;
  if (type === "GOLD") return 3;
  if (type === "CRYSTAL" || type === "EXPLOSIVE_ROCK") return 2;
  return 1;
}

export class BreakTimeSystem {
  #gauge: number;
  #active = false;
  #remainingSeconds = 0;

  constructor(initialGauge = 0) {
    this.#gauge = Math.max(0, Math.min(100, initialGauge));
  }

  onBreak(type: BlockType): Readonly<BreakTimeState> {
    if (this.#active) return this.#state(false, false);
    this.#gauge = Math.min(100, this.#gauge + gaugeValue(type));
    if (this.#gauge >= 100) {
      this.#active = true;
      this.#remainingSeconds = BALANCE.breakTimeDurationSeconds;
      return this.#state(true, false);
    }
    return this.#state(false, false);
  }

  step(dt: number): Readonly<BreakTimeState> {
    if (!this.#active) return this.#state(false, false);
    this.#remainingSeconds = Math.max(0, this.#remainingSeconds - Math.max(0, dt));
    if (this.#remainingSeconds <= 1e-9) {
      this.#active = false;
      this.#remainingSeconds = 0;
      this.#gauge = 0;
      return this.#state(false, true);
    }
    return this.#state(false, false);
  }

  cancel(): void {
    this.#active = false;
    this.#remainingSeconds = 0;
    this.#gauge = 0;
  }

  getState(): Readonly<BreakTimeState> {
    return this.#state(false, false);
  }

  getModifiers(): Readonly<BreakTimeModifiers> {
    return this.#active
      ? Object.freeze({
          miningSpeedMultiplier: 1.5,
          moveSpeedMultiplier: 1.2,
          explosionChanceBonus: 0.25,
          rewardMultiplier: 1.3,
        })
      : Object.freeze({
          miningSpeedMultiplier: 1,
          moveSpeedMultiplier: 1,
          explosionChanceBonus: 0,
          rewardMultiplier: 1,
        });
  }

  #state(started: boolean, ended: boolean): Readonly<BreakTimeState> {
    return Object.freeze({
      gauge: this.#gauge,
      active: this.#active,
      remainingSeconds: this.#remainingSeconds,
      started,
      ended,
    });
  }
}
