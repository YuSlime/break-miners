import { BALANCE } from "../data/balance";
import type { BlockTarget } from "../combat/DamageSystem";
import type { InputSnapshot, Vec2 } from "../game/gameTypes";
import { ChunkManager } from "../world/ChunkManager";

export interface PlayerState {
  position: Vec2;
  moveSpeed: number;
  radius: number;
}

export interface PlayerSystemOptions {
  position: Vec2;
  moveSpeed: number;
  radius: number;
}

export interface PlayerStepResult {
  moved: boolean;
  miningTarget: BlockTarget | null;
}

export class PlayerSystem {
  readonly #state: PlayerState;

  constructor(options: PlayerSystemOptions) {
    this.#state = {
      position: { ...options.position },
      moveSpeed: options.moveSpeed,
      radius: options.radius,
    };
  }

  setMoveSpeed(moveSpeed: number): void {
    this.#state.moveSpeed = Math.max(0, moveSpeed);
  }

  step(
    dt: number,
    input: InputSnapshot,
    world: ChunkManager,
  ): PlayerStepResult {
    const deltaX = input.moveX * this.#state.moveSpeed * dt;
    const deltaY = input.moveY * this.#state.moveSpeed * dt;
    if (deltaX === 0 && deltaY === 0) {
      return { moved: false, miningTarget: null };
    }

    const proposed = {
      x: this.#state.position.x + deltaX,
      y: this.#state.position.y + deltaY,
    };
    const leadingX = proposed.x + Math.sign(deltaX) * this.#state.radius;
    const leadingY = proposed.y + Math.sign(deltaY) * this.#state.radius;
    const targetTileX = Math.floor(leadingX / BALANCE.tileSize);
    const targetTileY = Math.floor(leadingY / BALANCE.tileSize);
    const block = world.getBlockAt(targetTileX, targetTileY);

    if (block) {
      if (deltaX > 0) proposed.x = block.tileX * BALANCE.tileSize - this.#state.radius;
      if (deltaX < 0) proposed.x = (block.tileX + 1) * BALANCE.tileSize + this.#state.radius;
      if (deltaY > 0) proposed.y = block.tileY * BALANCE.tileSize - this.#state.radius;
      if (deltaY < 0) proposed.y = (block.tileY + 1) * BALANCE.tileSize + this.#state.radius;
      const moved =
        proposed.x !== this.#state.position.x || proposed.y !== this.#state.position.y;
      this.#state.position = proposed;
      return {
        moved,
        miningTarget: {
          blockId: block.id,
          tileX: block.tileX,
          tileY: block.tileY,
        },
      };
    }

    this.#state.position = proposed;
    return { moved: true, miningTarget: null };
  }

  getState(): Readonly<PlayerState> {
    return Object.freeze({
      ...this.#state,
      position: Object.freeze({ ...this.#state.position }),
    });
  }
}
