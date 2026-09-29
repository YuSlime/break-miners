import { BALANCE } from "../data/balance";
import type { Vec2 } from "../game/gameTypes";
import { ChunkManager } from "../world/ChunkManager";
import { SeededRng } from "../world/SeededRng";
import type { BlockState } from "../world/worldTypes";

export interface BlockTarget {
  blockId: string;
  tileX: number;
  tileY: number;
}

export type DamageSource = "DRILL" | "EXPLOSION" | "LIGHTNING" | "DRONE";

export interface DamageRequest {
  target: BlockTarget;
  amount: number;
  criticalChance: number;
  criticalMultiplier: number;
  source: DamageSource;
  chainDepth: number;
}

export interface DamageResult {
  hit: boolean;
  damageApplied: number;
  critical: boolean;
  destroyed: boolean;
  destroyedBlock?: Readonly<BlockState>;
  position: Vec2;
  source: DamageSource;
  chainDepth: number;
}

export class DamageSystem {
  readonly #world: ChunkManager;
  readonly #rng: SeededRng;

  constructor(world: ChunkManager, rng: SeededRng) {
    this.#world = world;
    this.#rng = rng;
  }

  apply(request: DamageRequest): DamageResult {
    const position = {
      x: request.target.tileX * BALANCE.tileSize + BALANCE.tileSize / 2,
      y: request.target.tileY * BALANCE.tileSize + BALANCE.tileSize / 2,
    };
    const liveBlock = this.#world.getBlockAt(request.target.tileX, request.target.tileY);
    if (!liveBlock || liveBlock.id !== request.target.blockId) {
      return {
        hit: false,
        damageApplied: 0,
        critical: false,
        destroyed: false,
        position,
        source: request.source,
        chainDepth: request.chainDepth,
      };
    }

    const critical = this.#rng.chance(request.criticalChance);
    const damage = request.amount * (critical ? request.criticalMultiplier : 1);
    const result = this.#world.damageBlock(
      request.target.tileX,
      request.target.tileY,
      damage,
    );

    return {
      hit: result !== undefined,
      damageApplied: result?.damageApplied ?? 0,
      critical,
      destroyed: result?.destroyed ?? false,
      destroyedBlock: result?.destroyed ? result.block : undefined,
      position,
      source: request.source,
      chainDepth: request.chainDepth,
    };
  }
}
