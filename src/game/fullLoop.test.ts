import { GameEngine } from "./GameEngine";

describe("vertical-slice gameplay loop", () => {
  it("mines a Core Gate, levels up, enters BREAK TIME, and freezes the build in Result", () => {
    const engine = new GameEngine({
      seed: "full-loop",
      runDurationSeconds: 1,
      startingDepthMeters: 99,
      startingBreakGauge: 99,
      baseDrillPower: 10_000,
    });
    engine.dispatch({ type: "START_RUN" });
    engine.dispatch({
      type: "SET_INPUT",
      input: { moveX: 0, moveY: 1, abilityPressed: false },
    });

    for (
      let step = 0;
      step < 60 && engine.getSnapshot().phase === "RUNNING";
      step += 1
    ) engine.advance(1 / 60);

    const levelUp = engine.getSnapshot();
    expect(levelUp.phase).toBe("LEVEL_UP");
    expect(levelUp.coreShards).toBe(1);
    expect(levelUp.breakTimeRemainingSeconds).toBeGreaterThan(0);
    expect(levelUp.upgradeChoices).toHaveLength(3);
    const selected = levelUp.upgradeChoices[0]!.id;
    engine.dispatch({ type: "SELECT_UPGRADE", upgradeId: selected });

    for (let step = 0; step < 500 && engine.getSnapshot().phase !== "RESULT"; step += 1) {
      const current = engine.getSnapshot();
      if (current.phase === "LEVEL_UP") {
        engine.dispatch({
          type: "SELECT_UPGRADE",
          upgradeId: current.upgradeChoices[0]!.id,
        });
      } else {
        engine.advance(1 / 60);
      }
    }

    expect(engine.getSnapshot()).toMatchObject({
      phase: "RESULT",
      breakTimeRemainingSeconds: 0,
      result: {
        reason: "TIMER",
        coreShards: 1,
        build: expect.objectContaining({ [selected]: expect.any(Number) }),
      },
    });
  });
});
