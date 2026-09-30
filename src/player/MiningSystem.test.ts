import { MiningSystem } from "./MiningSystem";

describe("MiningSystem", () => {
  it("emits exactly ten mining pulses per second at base speed", () => {
    const mining = new MiningSystem();
    const target = { blockId: "block-1", tileX: 4, tileY: 9 };

    const requests = mining.step(1, target, {
      drillPower: 10,
      miningSpeedMultiplier: 1,
      criticalChance: 0.05,
      criticalMultiplier: 2,
    });

    expect(requests).toHaveLength(10);
    expect(requests.every((request) => request.amount === 10)).toBe(true);
    expect(requests.every((request) => request.target.blockId === "block-1")).toBe(true);
  });

  it("does not carry pulse time from one target to another", () => {
    const mining = new MiningSystem();
    const stats = {
      drillPower: 10,
      miningSpeedMultiplier: 1,
      criticalChance: 0,
      criticalMultiplier: 2,
    };

    expect(mining.step(0.09, { blockId: "a", tileX: 0, tileY: 0 }, stats)).toHaveLength(0);
    expect(mining.step(0.02, { blockId: "b", tileX: 1, tileY: 0 }, stats)).toHaveLength(0);
  });
});
