import { BALANCE } from "../data/balance";
import { WorldGenerator } from "./WorldGenerator";

describe("WorldGenerator", () => {
  it("generates reproducible fixed-size chunks from seed and coordinates", () => {
    const first = new WorldGenerator("mine-seed").generateChunk({ x: 0, y: 7 });
    const replay = new WorldGenerator("mine-seed").generateChunk({ x: 0, y: 7 });
    const different = new WorldGenerator("other-seed").generateChunk({ x: 0, y: 7 });

    expect(replay).toEqual(first);
    expect(first.blocks).toHaveLength(
      BALANCE.chunkWidthTiles * BALANCE.chunkHeightTiles,
    );
    expect(different.blocks).not.toEqual(first.blocks);
  });

  it("carves a connected mineable route from the top to bottom of chunk zero", () => {
    const chunk = new WorldGenerator(24).generateChunk({ x: 0, y: 3 });

    expect(chunk.routeColumns).toHaveLength(BALANCE.chunkHeightTiles);
    chunk.routeColumns.forEach((column, row) => {
      const index = row * BALANCE.chunkWidthTiles + column;
      expect(chunk.blocks[index]).toBeNull();
      if (row > 0) {
        expect(Math.abs(column - (chunk.routeColumns[row - 1] ?? column))).toBeLessThanOrEqual(1);
      }
    });
  });

  it.each([
    [199, "STONE_CAVERN"],
    [200, "CRYSTAL_MINE"],
    [449, "CRYSTAL_MINE"],
    [450, "MAGMA_CORE"],
    [749, "MAGMA_CORE"],
    [750, "ANCIENT_RUINS"],
    [1100, "CYBER_DEPTHS"],
    [1500, "THE_VOID"],
  ] as const)("maps depth %i to %s", (depth, expected) => {
    expect(new WorldGenerator(1).getBiome(depth)).toBe(expected);
  });

  it("places a core gate on each positive 100 meter boundary", () => {
    const generator = new WorldGenerator(8);
    const chunk = generator.generateChunk({ x: 0, y: 8 });
    const gate = chunk.blocks.find((block) => block?.type === "CORE_GATE");

    expect(gate).toMatchObject({ tileY: 100, destroyed: false });
  });
});
