import { BALANCE } from "../data/balance";
import { ChunkManager } from "./ChunkManager";
import { WorldGenerator } from "./WorldGenerator";

describe("ChunkManager", () => {
  it("loads chunks around the player and resolves blocks by tile coordinate", () => {
    const manager = new ChunkManager(new WorldGenerator(4), 1);

    manager.updateActiveSet({ x: 10 * BALANCE.tileSize, y: 20 * BALANCE.tileSize });

    expect(manager.getActiveChunks()).toHaveLength(9);
    const generatedBlock = manager
      .getActiveChunks()
      .flatMap((chunk) => chunk.blocks)
      .find((block) => block !== null);
    expect(generatedBlock).toBeDefined();
    expect(
      manager.getBlockAt(generatedBlock!.tileX, generatedBlock!.tileY),
    ).toEqual(generatedBlock);
  });

  it("keeps destroyed block deltas after a chunk unloads and regenerates", () => {
    const manager = new ChunkManager(new WorldGenerator(19), 0);
    manager.updateActiveSet({ x: 0, y: 0 });
    const block = manager
      .getActiveChunks()[0]!
      .blocks.find((candidate) => candidate !== null);
    expect(block).not.toBeNull();

    expect(manager.markDestroyed(block!.tileX, block!.tileY)).toBe(true);
    manager.updateActiveSet({
      x: BALANCE.chunkWidthTiles * BALANCE.tileSize * 5,
      y: 0,
    });
    manager.updateActiveSet({ x: 0, y: 0 });

    expect(manager.getBlockAt(block!.tileX, block!.tileY)).toBeUndefined();
  });

  it("converts world pixels to displayed depth meters", () => {
    const manager = new ChunkManager(new WorldGenerator(1), 0);

    expect(manager.getDepthMeters(320)).toBe(10);
    expect(manager.getDepthMeters(-32)).toBe(0);
  });
});
