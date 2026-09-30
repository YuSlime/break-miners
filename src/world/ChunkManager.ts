import { BALANCE } from "../data/balance";
import type { Vec2 } from "../game/gameTypes";
import type { BlockDamageResult, BlockState, ChunkData } from "./worldTypes";
import { WorldGenerator } from "./WorldGenerator";

function chunkKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function blockKey(tileX: number, tileY: number): string {
  return `${tileX}:${tileY}`;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export class ChunkManager {
  readonly #generator: WorldGenerator;
  readonly #activeRadiusChunks: number;
  readonly #activeChunks = new Map<string, ChunkData>();
  readonly #destroyedBlocks = new Set<string>();

  constructor(generator: WorldGenerator, activeRadiusChunks: number) {
    this.#generator = generator;
    this.#activeRadiusChunks = activeRadiusChunks;
  }

  updateActiveSet(playerWorldPosition: Vec2): void {
    const tileX = Math.floor(playerWorldPosition.x / BALANCE.tileSize);
    const tileY = Math.floor(playerWorldPosition.y / BALANCE.tileSize);
    const centerX = Math.floor(tileX / BALANCE.chunkWidthTiles);
    const centerY = Math.floor(tileY / BALANCE.chunkHeightTiles);
    const desired = new Set<string>();

    for (
      let chunkY = centerY - this.#activeRadiusChunks;
      chunkY <= centerY + this.#activeRadiusChunks;
      chunkY += 1
    ) {
      for (
        let chunkX = centerX - this.#activeRadiusChunks;
        chunkX <= centerX + this.#activeRadiusChunks;
        chunkX += 1
      ) {
        const key = chunkKey(chunkX, chunkY);
        desired.add(key);
        if (!this.#activeChunks.has(key)) {
          const chunk = this.#generator.generateChunk({ x: chunkX, y: chunkY });
          chunk.blocks = chunk.blocks.map((block) =>
            block && this.#destroyedBlocks.has(blockKey(block.tileX, block.tileY))
              ? null
              : block,
          );
          this.#activeChunks.set(key, chunk);
        }
      }
    }

    for (const key of this.#activeChunks.keys()) {
      if (!desired.has(key)) this.#activeChunks.delete(key);
    }
  }

  getBlockAt(tileX: number, tileY: number): BlockState | undefined {
    const chunkX = Math.floor(tileX / BALANCE.chunkWidthTiles);
    const chunkY = Math.floor(tileY / BALANCE.chunkHeightTiles);
    const chunk = this.#activeChunks.get(chunkKey(chunkX, chunkY));
    if (!chunk) return undefined;
    const localX = positiveModulo(tileX, BALANCE.chunkWidthTiles);
    const localY = positiveModulo(tileY, BALANCE.chunkHeightTiles);
    return chunk.blocks[localY * BALANCE.chunkWidthTiles + localX] ?? undefined;
  }

  damageBlock(tileX: number, tileY: number, damage: number): BlockDamageResult | undefined {
    const block = this.getBlockAt(tileX, tileY);
    if (!block || damage <= 0) return undefined;
    const damageApplied = Math.min(block.currentHp, damage);
    block.currentHp -= damageApplied;
    const destroyed = block.currentHp <= 0;
    if (destroyed) this.markDestroyed(tileX, tileY);
    return { block: { ...block, destroyed }, damageApplied, remainingHp: block.currentHp, destroyed };
  }

  markDestroyed(tileX: number, tileY: number): boolean {
    const block = this.getBlockAt(tileX, tileY);
    if (!block) return false;
    this.#destroyedBlocks.add(blockKey(tileX, tileY));
    const chunkX = Math.floor(tileX / BALANCE.chunkWidthTiles);
    const chunkY = Math.floor(tileY / BALANCE.chunkHeightTiles);
    const chunk = this.#activeChunks.get(chunkKey(chunkX, chunkY));
    if (!chunk) return false;
    const localX = positiveModulo(tileX, BALANCE.chunkWidthTiles);
    const localY = positiveModulo(tileY, BALANCE.chunkHeightTiles);
    chunk.blocks[localY * BALANCE.chunkWidthTiles + localX] = null;
    return true;
  }

  getActiveChunks(): readonly ChunkData[] {
    return [...this.#activeChunks.values()].sort(
      (left, right) =>
        left.coordinate.y - right.coordinate.y ||
        left.coordinate.x - right.coordinate.x,
    );
  }

  getDepthMeters(worldY: number): number {
    return Math.max(0, Math.floor(worldY / BALANCE.tileSize));
  }
}
