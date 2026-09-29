import { BALANCE } from "../data/balance";
import { BIOME_BLOCK_WEIGHTS, BLOCK_DEFINITIONS } from "../data/blocks";
import { SeededRng } from "./SeededRng";
import type { BiomeId, BlockState, BlockType, ChunkCoordinate, ChunkData } from "./worldTypes";

function weightedBlockType(
  rng: SeededRng,
  weights: readonly [BlockType, number][],
): BlockType {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [type, weight] of weights) {
    roll -= weight;
    if (roll < 0) return type;
  }
  return weights[weights.length - 1]![0];
}

export class WorldGenerator {
  readonly #seed: number | string;
  readonly #rootRng: SeededRng;
  readonly #routePhase: number;

  constructor(seed: number | string) {
    this.#seed = seed;
    this.#rootRng = new SeededRng(seed);
    this.#routePhase = this.#rootRng.fork("route").next() * Math.PI * 2;
  }

  generateChunk(coordinate: ChunkCoordinate): ChunkData {
    const rng = this.#rootRng.fork(`chunk:${coordinate.x}:${coordinate.y}`);
    const startTileY = coordinate.y * BALANCE.chunkHeightTiles;
    const biome = this.getBiome(Math.max(0, startTileY));
    const blocks: Array<BlockState | null> = [];
    const routeColumns = Array.from(
      { length: BALANCE.chunkHeightTiles },
      (_, row) => this.#routeColumn(startTileY + row),
    );

    for (let row = 0; row < BALANCE.chunkHeightTiles; row += 1) {
      const tileY = startTileY + row;
      for (let column = 0; column < BALANCE.chunkWidthTiles; column += 1) {
        const tileX = coordinate.x * BALANCE.chunkWidthTiles + column;
        const routeColumn = routeColumns[row]!;
        const isRoute = coordinate.x === 0 && column === routeColumn;
        const isGate = isRoute && tileY > 0 && tileY % 100 === 0;

        if (isRoute && !isGate) {
          blocks.push(null);
          continue;
        }

        const type = isGate
          ? "CORE_GATE"
          : weightedBlockType(rng, BIOME_BLOCK_WEIGHTS[biome]);
        const definition = BLOCK_DEFINITIONS[type];
        const depthScale = 1 + Math.pow(Math.max(0, tileY) / 150, 1.2);
        const maxHp = Math.ceil(
          definition.baseHp *
            depthScale *
            BALANCE.biomeHpModifiers[biome],
        );
        blocks.push({
          id: `${this.#seed}:${tileX}:${tileY}`,
          type,
          tileX,
          tileY,
          currentHp: maxHp,
          maxHp,
          destroyed: false,
        });
      }
    }

    return { coordinate: { ...coordinate }, biome, blocks, routeColumns };
  }

  getBiome(depthMeters: number): BiomeId {
    if (depthMeters < 200) return "STONE_CAVERN";
    if (depthMeters < 450) return "CRYSTAL_MINE";
    if (depthMeters < 750) return "MAGMA_CORE";
    if (depthMeters < 1100) return "ANCIENT_RUINS";
    if (depthMeters < 1500) return "CYBER_DEPTHS";
    return "THE_VOID";
  }

  #routeColumn(globalTileY: number): number {
    const center = Math.floor(BALANCE.chunkWidthTiles / 2);
    return Math.max(
      1,
      Math.min(
        BALANCE.chunkWidthTiles - 2,
        center + Math.round(Math.sin(globalTileY * 0.17 + this.#routePhase) * 3),
      ),
    );
  }
}
