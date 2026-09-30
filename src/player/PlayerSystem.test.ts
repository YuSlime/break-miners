import { BALANCE } from "../data/balance";
import { ChunkManager } from "../world/ChunkManager";
import { WorldGenerator } from "../world/WorldGenerator";
import { PlayerSystem } from "./PlayerSystem";

function worldAndRoute(seed: number) {
  const world = new ChunkManager(new WorldGenerator(seed), 0);
  world.updateActiveSet({ x: 0, y: 0 });
  const chunk = world.getActiveChunks()[0]!;
  const routeColumn = chunk.routeColumns[0]!;
  const position = {
    x: routeColumn * BALANCE.tileSize + BALANCE.tileSize / 2,
    y: BALANCE.tileSize / 2,
  };
  return { world, position };
}

describe("PlayerSystem", () => {
  it("moves immediately through free space", () => {
    const { world, position } = worldAndRoute(2);
    const player = new PlayerSystem({ position, moveSpeed: 100, radius: 10 });

    const result = player.step(
      0.01,
      { moveX: 0, moveY: -1, abilityPressed: false },
      world,
    );

    expect(result.moved).toBe(true);
    expect(player.getState().position.y).toBeCloseTo(position.y - 1, 8);
    expect(result.miningTarget).toBeNull();
  });

  it("applies a runtime movement-speed modifier", () => {
    const { world, position } = worldAndRoute(2);
    const player = new PlayerSystem({ position, moveSpeed: 100, radius: 10 });

    player.setMoveSpeed(120);
    player.step(
      0.01,
      { moveX: 0, moveY: -1, abilityPressed: false },
      world,
    );

    expect(player.getState().position.y).toBeCloseTo(position.y - 1.2, 8);
  });

  it("clamps at a block, returns it as mining target, then resumes after destruction", () => {
    const { world, position } = worldAndRoute(3);
    const player = new PlayerSystem({ position, moveSpeed: 100, radius: 10 });
    const input = { moveX: 1, moveY: 0, abilityPressed: false };

    const contact = player.step(0.2, input, world);

    expect(contact.miningTarget).not.toBeNull();
    const contactX = player.getState().position.x;
    expect(contact.miningTarget!.tileX * BALANCE.tileSize - contactX).toBe(10);

    world.markDestroyed(contact.miningTarget!.tileX, contact.miningTarget!.tileY);
    const resumed = player.step(0.1, input, world);

    expect(resumed.moved).toBe(true);
    expect(resumed.miningTarget).toBeNull();
    expect(player.getState().position.x).toBeGreaterThan(contactX);
  });
});
