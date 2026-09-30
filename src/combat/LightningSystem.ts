import { BALANCE } from "../data/balance";
import type { Vec2 } from "../game/gameTypes";
import type { DerivedRunStats } from "../upgrades/UpgradeEffects";
import type { BlockState } from "../world/worldTypes";
import type { DamageRequest } from "./DamageSystem";

export interface LightningRequest {
  origin: Vec2;
  damage: number;
  targetCount: number;
  chainDepth: number;
  thunderGod?: boolean;
}

export interface CriticalSignal {
  critical: boolean;
  position: Vec2;
}

export class LightningSystem {
  readonly #queue: LightningRequest[] = [];

  clear(): void {
    this.#queue.length = 0;
  }

  enqueue(request: LightningRequest): boolean {
    if (
      request.chainDepth > BALANCE.maxChainDepth ||
      this.#queue.length >= BALANCE.maxPendingGameplayEvents
    ) {
      return false;
    }
    this.#queue.push({ ...request, origin: { ...request.origin } });
    return true;
  }

  enqueueFromCritical(
    signal: CriticalSignal,
    stats: Readonly<DerivedRunStats>,
    chainDepth: number,
  ): boolean {
    if (!signal.critical || !stats.staticHit) return false;
    return this.enqueue({
      origin: signal.position,
      damage: stats.drillPower * stats.lightningDamageMultiplier,
      targetCount: stats.thunderGod ? 12 : Math.max(1, stats.lightningTargets),
      chainDepth: chainDepth + 1,
      thunderGod: stats.thunderGod,
    });
  }

  processTick(context: {
    blocks: readonly Readonly<BlockState>[];
  }): readonly DamageRequest[] {
    const requests: DamageRequest[] = [];
    while (this.#queue.length > 0 && requests.length < 128) {
      const lightning = this.#queue.shift()!;
      const cap = lightning.thunderGod
        ? Math.min(12, lightning.targetCount)
        : lightning.targetCount;
      const targets = context.blocks
        .filter((block) => !block.destroyed)
        .sort((left, right) => {
          const leftDistance = Math.hypot(
            left.tileX - lightning.origin.x,
            left.tileY - lightning.origin.y,
          );
          const rightDistance = Math.hypot(
            right.tileX - lightning.origin.x,
            right.tileY - lightning.origin.y,
          );
          return leftDistance - rightDistance || left.id.localeCompare(right.id);
        })
        .slice(0, cap);
      targets.forEach((block) => {
        requests.push({
          target: { blockId: block.id, tileX: block.tileX, tileY: block.tileY },
          amount: lightning.damage,
          criticalChance: 0,
          criticalMultiplier: 1,
          source: "LIGHTNING",
          chainDepth: lightning.chainDepth,
        });
      });
    }
    return requests;
  }
}
