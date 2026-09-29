import { BALANCE } from "../data/balance";
import { ChunkManager } from "../world/ChunkManager";
import { SeededRng } from "../world/SeededRng";
import { WorldGenerator } from "../world/WorldGenerator";
import { DamageSystem } from "./DamageSystem";

function blockFixture() {
  const world = new ChunkManager(new WorldGenerator(12), 0);
  world.updateActiveSet({ x: 0, y: 0 });
  const block = world.getActiveChunks()[0]!.blocks.find((candidate) => candidate !== null)!;
  return { world, block };
}

describe("DamageSystem", () => {
  it("applies deterministic non-critical damage to a live block", () => {
    const { world, block } = blockFixture();
    const damage = new DamageSystem(world, new SeededRng(1));

    const result = damage.apply({
      target: { blockId: block.id, tileX: block.tileX, tileY: block.tileY },
      amount: 5,
      criticalChance: 0,
      criticalMultiplier: 2,
      source: "DRILL",
      chainDepth: 0,
    });

    expect(result).toMatchObject({ damageApplied: 5, critical: false });
    expect(world.getBlockAt(block.tileX, block.tileY)?.currentHp).toBe(block.maxHp - 5);
  });

  it("multiplies damage for a guaranteed critical hit", () => {
    const { world, block } = blockFixture();
    const damage = new DamageSystem(world, new SeededRng(1));

    const result = damage.apply({
      target: { blockId: block.id, tileX: block.tileX, tileY: block.tileY },
      amount: 5,
      criticalChance: 1,
      criticalMultiplier: 2,
      source: "DRILL",
      chainDepth: 0,
    });

    expect(result.damageApplied).toBe(10);
    expect(result.critical).toBe(true);
    expect(result.position).toEqual({
      x: block.tileX * BALANCE.tileSize + BALANCE.tileSize / 2,
      y: block.tileY * BALANCE.tileSize + BALANCE.tileSize / 2,
    });
  });
});
