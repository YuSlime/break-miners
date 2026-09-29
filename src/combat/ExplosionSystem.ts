import { BALANCE } from "../data/balance";
import type { DerivedRunStats } from "../upgrades/UpgradeEffects";
import { SeededRng } from "../world/SeededRng";
import type { BlockState } from "../world/worldTypes";
import type { Vec2 } from "../game/gameTypes";
import type { BreakRequest } from "./BreakPipeline";
import type { DamageRequest, DamageResult } from "./DamageSystem";

export interface ExplosionRequest {
  position: Vec2;
  radiusTiles: number;
  damage: number;
  chainDepth: number;
  clusterBombs: number;
}

export interface ExplosionContext {
  blocks: readonly Readonly<BlockState>[];
  applyDamage(request: DamageRequest): DamageResult | undefined;
}

export class ExplosionSystem {
  readonly #rng: SeededRng;
  readonly #queue: ExplosionRequest[] = [];

  constructor(rng: SeededRng) {
    this.#rng = rng;
  }

  get pendingCount(): number {
    return this.#queue.length;
  }

  maybeEnqueueOnBreak(
    block: Readonly<BlockState>,
    stats: Readonly<DerivedRunStats>,
    chainDepth: number,
  ): boolean {
    if (stats.nuclearBomb && this.#rng.chance(0.05)) {
      return this.enqueueNuclear({ x: block.tileX, y: block.tileY }, chainDepth);
    }
    const guaranteed = block.type === "EXPLOSIVE_ROCK";
    if (!guaranteed && !this.#rng.chance(Math.min(1, stats.explosionChance))) {
      return false;
    }
    const request: ExplosionRequest = {
      position: { x: block.tileX, y: block.tileY },
      radiusTiles: stats.explosionRadius,
      damage: stats.drillPower * stats.explosionDamageMultiplier,
      chainDepth: chainDepth + 1,
      clusterBombs: stats.clusterBombs,
    };
    this.enqueue(request);
    if (stats.multiBombChance > 0 && this.#rng.chance(stats.multiBombChance)) {
      this.enqueue({ ...request, position: { x: block.tileX + 1, y: block.tileY } });
    }
    return true;
  }

  enqueue(request: ExplosionRequest): boolean {
    if (
      request.chainDepth > BALANCE.maxChainDepth ||
      this.#queue.length >= BALANCE.maxPendingGameplayEvents
    ) {
      return false;
    }
    this.#queue.push({ ...request, position: { ...request.position } });
    return true;
  }

  enqueueNuclear(position: Vec2, chainDepth: number): boolean {
    return this.enqueue({
      position,
      radiusTiles: 12,
      damage: 1_000,
      chainDepth: chainDepth + 1,
      clusterBombs: 0,
    });
  }

  processTick(context: ExplosionContext): readonly BreakRequest[] {
    const initialCount = Math.min(this.#queue.length, 128);
    const broken: BreakRequest[] = [];
    for (let index = 0; index < initialCount; index += 1) {
      const request = this.#queue.shift()!;
      const candidates = context.blocks
        .filter(
          (block) =>
            !block.destroyed &&
            Math.hypot(
              block.tileX - request.position.x,
              block.tileY - request.position.y,
            ) <= request.radiusTiles,
        )
        .sort((left, right) => left.id.localeCompare(right.id));
      for (const block of candidates) {
        const result = context.applyDamage({
          target: { blockId: block.id, tileX: block.tileX, tileY: block.tileY },
          amount: request.damage,
          criticalChance: 0,
          criticalMultiplier: 1,
          source: "EXPLOSION",
          chainDepth: request.chainDepth,
        });
        if (result?.destroyedBlock) {
          broken.push({ block: result.destroyedBlock, chainDepth: request.chainDepth });
        }
      }
      for (let child = 0; child < request.clusterBombs; child += 1) {
        const angle = (Math.PI * 2 * child) / request.clusterBombs;
        this.enqueue({
          position: {
            x: request.position.x + Math.cos(angle) * request.radiusTiles,
            y: request.position.y + Math.sin(angle) * request.radiusTiles,
          },
          radiusTiles: Math.max(1, request.radiusTiles * 0.45),
          damage: request.damage * 0.5,
          chainDepth: request.chainDepth + 1,
          clusterBombs: 0,
        });
      }
    }
    return broken;
  }
}
