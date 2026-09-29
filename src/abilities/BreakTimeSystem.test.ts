import { BreakTimeSystem } from "./BreakTimeSystem";
import { ComboSystem } from "./ComboSystem";

describe("ComboSystem", () => {
  it("increments on breaks and starts decaying only after 1.2 idle seconds", () => {
    const combo = new ComboSystem();
    combo.onBreak(12);
    combo.step(1.19);
    expect(combo.getState().combo).toBe(12);
    combo.step(0.02);
    expect(combo.getState().combo).toBeLessThan(12);
  });

  it("emits each crossed milestone once", () => {
    const combo = new ComboSystem();
    expect(combo.onBreak(10).milestones).toEqual([10]);
    expect(combo.onBreak(40).milestones).toEqual([25, 50]);
    expect(combo.onBreak(1).milestones).toEqual([]);
  });
});

describe("BreakTimeSystem", () => {
  it("awards gauge by block class and starts at 100", () => {
    const system = new BreakTimeSystem(89);
    expect(system.onBreak("STONE").gauge).toBe(90);
    expect(system.onBreak("CRYSTAL").gauge).toBe(92);
    expect(system.onBreak("GOLD").gauge).toBe(95);
    const started = system.onBreak("GEODE");
    expect(started).toMatchObject({ active: true, gauge: 100, started: true });
    expect(started.remainingSeconds).toBe(8);
  });

  it("applies exact modifiers, ignores active gauge gain, and resets on expiry", () => {
    const system = new BreakTimeSystem(99);
    system.onBreak("STONE");

    expect(system.getModifiers()).toEqual({
      miningSpeedMultiplier: 1.5,
      moveSpeedMultiplier: 1.2,
      explosionChanceBonus: 0.25,
      rewardMultiplier: 1.3,
    });
    expect(system.onBreak("GEODE").gauge).toBe(100);
    expect(system.step(8)).toMatchObject({ active: false, gauge: 0, ended: true });
  });
});
