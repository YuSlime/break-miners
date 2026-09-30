import { DroneSystem } from "./DroneSystem";

const blocks = [
  { id: "far", type: "STONE" as const, tileX: 8, tileY: 0, currentHp: 10, maxHp: 10, destroyed: false },
  { id: "near", type: "STONE" as const, tileX: 2, tileY: 0, currentHp: 10, maxHp: 10, destroyed: false },
];

describe("DroneSystem", () => {
  it("acquires the nearest block and respects its attack cooldown", () => {
    const drones = new DroneSystem();
    drones.syncBuild({ mining_drone: 1 });

    expect(drones.step(0.99, { blocks, playerPosition: { x: 0, y: 0 } })).toHaveLength(0);
    const attacks = drones.step(0.01, { blocks, playerPosition: { x: 0, y: 0 } });
    expect(attacks).toHaveLength(1);
    expect(attacks[0]!.target.blockId).toBe("near");
  });

  it("applies speed, power, laser presentation, and Drone Army count", () => {
    const drones = new DroneSystem();
    drones.syncBuild({ mining_drone: 1, rapid_drone: 1, power_drone: 1, laser_drone: 1, drone_army: 1 });

    const attacks = drones.step(0.8, { blocks, playerPosition: { x: 0, y: 0 } });

    expect(drones.getRenderState()).toHaveLength(6);
    expect(attacks.length).toBeGreaterThan(0);
    expect(attacks[0]).toMatchObject({ amount: 13.5, source: "DRONE", presentation: "LASER" });
  });
});
