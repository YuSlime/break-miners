import { BALANCE } from "../data/balance";
import type { BlockTarget, DamageRequest } from "../combat/DamageSystem";

export interface MiningStats {
  drillPower: number;
  miningSpeedMultiplier: number;
  criticalChance: number;
  criticalMultiplier: number;
}

export class MiningSystem {
  #targetId: string | undefined;
  #accumulator = 0;

  step(
    dt: number,
    target: BlockTarget | null,
    stats: MiningStats,
  ): readonly DamageRequest[] {
    if (!target) {
      this.resetTarget();
      return [];
    }
    if (this.#targetId !== target.blockId) {
      this.#targetId = target.blockId;
      this.#accumulator = 0;
    }

    this.#accumulator += dt * stats.miningSpeedMultiplier;
    const requests: DamageRequest[] = [];
    const epsilon = BALANCE.miningPulseSeconds * 1e-9;
    while (this.#accumulator + epsilon >= BALANCE.miningPulseSeconds) {
      this.#accumulator -= BALANCE.miningPulseSeconds;
      requests.push({
        target,
        amount: stats.drillPower,
        criticalChance: stats.criticalChance,
        criticalMultiplier: stats.criticalMultiplier,
        source: "DRILL",
        chainDepth: 0,
      });
    }
    return requests;
  }

  resetTarget(): void {
    this.#targetId = undefined;
    this.#accumulator = 0;
  }
}
