import { RunSystem, creditsFromRunCoins } from "./RunSystem";

describe("RunSystem", () => {
  it("expires after exactly sixty fixed steps for a one-second run", () => {
    const run = new RunSystem({ durationSeconds: 1, seed: 7 });

    for (let step = 0; step < 59; step += 1) {
      expect(run.step(1 / 60).ended).toBe(false);
    }
    expect(run.step(1 / 60)).toMatchObject({ ended: true, timeRemainingSeconds: 0 });
  });

  it("creates a frozen result with rewards, records, geodes, and build", () => {
    const run = new RunSystem({
      durationSeconds: 10,
      seed: "result",
      firstCompletedRun: true,
      records: { deepestMeters: 40, bestCombo: 3, mostBlocksBroken: 2 },
      build: { power_drill: 2 },
    });
    run.recordBlockBreak({ type: "STONE", runCoins: 7, combo: 4 });
    run.recordBlockBreak({ type: "GEODE", runCoins: 3, combo: 8 });
    run.recordCoreDestroyed({ depthMeters: 100, coreShards: 1 });
    run.setDepth(125);

    const result = run.finish("MANUAL");

    expect(result).toMatchObject({
      reason: "MANUAL",
      depthMeters: 125,
      blocksBroken: 2,
      bestCombo: 8,
      runCoins: 10,
      coreShards: 1,
      geodes: 1,
      build: { power_drill: 2 },
    });
    expect(result.awardedCredits).toBeGreaterThanOrEqual(10);
    expect(result.recordChanges).toEqual([
      { record: "deepestMeters", previous: 40, current: 125 },
      { record: "bestCombo", previous: 3, current: 8 },
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.build)).toBe(true);
  });

  it("awards each core gate once", () => {
    const run = new RunSystem({ durationSeconds: 10, seed: 1 });

    expect(run.recordCoreDestroyed({ depthMeters: 100, coreShards: 1 })).toBe(true);
    expect(run.recordCoreDestroyed({ depthMeters: 100, coreShards: 1 })).toBe(false);
    expect(run.finish("MANUAL").coreShards).toBe(1);
  });

  it("uses a pure conversion while guaranteeing an entry purchase on the first run", () => {
    expect(creditsFromRunCoins(95)).toBe(9);
    const first = new RunSystem({ durationSeconds: 1, seed: 1, firstCompletedRun: true });
    expect(first.finish("TIMER").awardedCredits).toBe(10);
  });
});
