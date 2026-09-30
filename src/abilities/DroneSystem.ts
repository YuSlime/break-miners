import type { DamageRequest } from "../combat/DamageSystem";
import type { Vec2 } from "../game/gameTypes";
import type { RunBuild } from "../upgrades/UpgradeManager";
import type { BlockState } from "../world/worldTypes";

export interface DroneRenderState {
  id: string;
  index: number;
  laser: boolean;
}

export interface DroneDamageRequest extends DamageRequest {
  presentation: "PULSE" | "LASER";
}

export class DroneSystem {
  #count = 0;
  #attackInterval = 1;
  #damage = 10;
  #laser = false;
  #accumulator = 0;

  reset(): void {
    this.#count = 0;
    this.#accumulator = 0;
  }

  syncBuild(build: Readonly<RunBuild>): void {
    this.#count = (build.mining_drone ?? 0) + ((build.drone_army ?? 0) > 0 ? 5 : 0);
    this.#attackInterval = 1 / (1 + (build.rapid_drone ?? 0) * 0.25);
    this.#damage = 10 * (1 + (build.power_drone ?? 0) * 0.35);
    this.#laser = (build.laser_drone ?? 0) > 0;
  }

  step(
    dt: number,
    context: {
      blocks: readonly Readonly<BlockState>[];
      playerPosition: Vec2;
    },
  ): readonly DroneDamageRequest[] {
    if (this.#count <= 0) return [];
    this.#accumulator += dt;
    if (this.#accumulator + 1e-9 < this.#attackInterval) return [];
    this.#accumulator %= this.#attackInterval;

    const target = context.blocks
      .filter((block) => !block.destroyed)
      .sort((left, right) => {
        const leftDistance = Math.hypot(
          left.tileX - context.playerPosition.x,
          left.tileY - context.playerPosition.y,
        );
        const rightDistance = Math.hypot(
          right.tileX - context.playerPosition.x,
          right.tileY - context.playerPosition.y,
        );
        return leftDistance - rightDistance || left.id.localeCompare(right.id);
      })[0];
    if (!target) return [];

    return Array.from({ length: this.#count }, () => ({
      target: { blockId: target.id, tileX: target.tileX, tileY: target.tileY },
      amount: this.#damage,
      criticalChance: 0,
      criticalMultiplier: 1,
      source: "DRONE" as const,
      chainDepth: 0,
      presentation: this.#laser ? ("LASER" as const) : ("PULSE" as const),
    }));
  }

  getRenderState(): readonly DroneRenderState[] {
    return Array.from({ length: this.#count }, (_, index) => ({
      id: `drone-${index}`,
      index,
      laser: this.#laser,
    }));
  }
}
