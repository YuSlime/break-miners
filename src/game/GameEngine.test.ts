import { GameEngine } from "./GameEngine";

describe("GameEngine clock", () => {
  it("starts in the menu and decrements time only while running", () => {
    const engine = new GameEngine({ runDurationSeconds: 2, seed: 7 });

    engine.advance(1);
    expect(engine.getSnapshot()).toMatchObject({
      phase: "MENU",
      timeRemainingSeconds: 2,
    });

    engine.dispatch({ type: "START_RUN" });
    engine.advance(1 / 30);

    expect(engine.getSnapshot().phase).toBe("RUNNING");
    expect(engine.getSnapshot().timeRemainingSeconds).toBeCloseTo(
      2 - 1 / 30,
      8,
    );
  });

  it("publishes snapshots at ten hertz instead of every simulation step", () => {
    const engine = new GameEngine({ runDurationSeconds: 2 });
    const listener = vi.fn();
    engine.subscribeSnapshot(listener);
    engine.dispatch({ type: "START_RUN" });

    engine.advance(0.05);
    expect(listener).toHaveBeenCalledTimes(1); // phase command publishes immediately

    engine.advance(0.05);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("resumes from a hidden tab without consuming hidden elapsed time", () => {
    const engine = new GameEngine({ runDurationSeconds: 10 });
    engine.dispatch({ type: "START_RUN" });
    engine.advance(1);
    const beforeHidden = engine.getSnapshot().timeRemainingSeconds;

    engine.setDocumentHidden(true);
    engine.advance(300);
    engine.setDocumentHidden(false);
    engine.advance(1 / 60);

    expect(engine.getSnapshot().timeRemainingSeconds).toBeCloseTo(
      beforeHidden - 1 / 60,
      8,
    );
  });

  it("stops notifying subscribers after destruction", () => {
    const engine = new GameEngine();
    const listener = vi.fn();
    engine.subscribeSnapshot(listener);

    engine.destroy();
    engine.dispatch({ type: "START_RUN" });
    engine.advance(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("exposes active generated blocks and biome after a run starts", () => {
    const engine = new GameEngine({ seed: "render-world" });

    engine.dispatch({ type: "START_RUN" });
    const renderState = engine.getRenderState();

    expect(renderState.biome).toBe("STONE_CAVERN");
    expect(renderState.blocks.length).toBeGreaterThan(0);
    expect(renderState.blocks[0]).toEqual(
      expect.objectContaining({ tileX: expect.any(Number), tileY: expect.any(Number) }),
    );
  });

  it("turns held movement into contact mining and block rewards", () => {
    const engine = new GameEngine({ seed: "contact-mining" });
    engine.dispatch({ type: "START_RUN" });
    engine.dispatch({
      type: "SET_INPUT",
      input: { moveX: 1, moveY: 0, abilityPressed: false },
    });

    for (let step = 0; step < 180; step += 1) {
      engine.advance(1 / 60);
    }

    const rewarded = engine.getSnapshot();
    expect(rewarded.level > 1 || rewarded.xp > 0).toBe(true);
    expect(rewarded.runCoins).toBeGreaterThan(0);
    expect(engine.getRenderState().player.position.x).toBeGreaterThan(0);
  });

  it("pauses on level-up with three choices and resumes after selection", () => {
    const engine = new GameEngine({ seed: "level-up-path" });
    engine.dispatch({ type: "START_RUN" });
    engine.dispatch({
      type: "SET_INPUT",
      input: { moveX: 1, moveY: 0, abilityPressed: false },
    });

    for (
      let step = 0;
      step < 3_600 && engine.getSnapshot().phase === "RUNNING";
      step += 1
    ) {
      engine.advance(1 / 60);
    }

    const levelUp = engine.getSnapshot();
    expect(levelUp.phase).toBe("LEVEL_UP");
    expect(levelUp.upgradeChoices).toHaveLength(3);
    const pausedTime = levelUp.timeRemainingSeconds;
    engine.advance(1);
    expect(engine.getSnapshot().timeRemainingSeconds).toBe(pausedTime);

    engine.dispatch({
      type: "SELECT_UPGRADE",
      upgradeId: levelUp.upgradeChoices[0]!.id,
    });
    expect(engine.getSnapshot().phase).toBe("RUNNING");
  });

  it("gives timer expiry priority over a level-up earned on the same fixed step", () => {
    const engine = new GameEngine({
      seed: 1,
      startingXp: 13,
      runDurationSeconds: 9 / 60,
    });
    engine.dispatch({ type: "START_RUN" });
    engine.dispatch({
      type: "SET_INPUT",
      input: { moveX: 1, moveY: 0, abilityPressed: false },
    });

    for (let step = 0; step < 9; step += 1) engine.advance(1 / 60);

    expect(engine.getSnapshot().timeRemainingSeconds).toBe(0);
    expect(engine.getSnapshot().phase).toBe("RESULT");
    expect(engine.getSnapshot().level).toBe(2);
    expect(engine.getSnapshot().upgradeChoices).toHaveLength(0);
    engine.dispatch({ type: "SELECT_UPGRADE", upgradeId: "power_drill" });
    expect(engine.getSnapshot().phase).toBe("RESULT");
  });

  it("does not start BREAK TIME when the timer expires on the threshold step", () => {
    const engine = new GameEngine({
      seed: 1,
      startingBreakGauge: 99,
      runDurationSeconds: 9 / 60,
    });
    engine.dispatch({ type: "START_RUN" });
    engine.dispatch({
      type: "SET_INPUT",
      input: { moveX: 1, moveY: 0, abilityPressed: false },
    });

    for (let step = 0; step < 9; step += 1) engine.advance(1 / 60);

    expect(engine.getSnapshot()).toMatchObject({
      phase: "RESULT",
      timeRemainingSeconds: 0,
      breakGauge: 0,
      breakTimeRemainingSeconds: 0,
    });
  });

  it("freezes a complete result and starts replay with a fresh default seed", () => {
    let now = 100;
    const engine = new GameEngine({
      now: () => now++,
      runDurationSeconds: 1 / 60,
    });
    engine.dispatch({ type: "START_RUN" });
    const firstSeed = engine.getRenderState().seed;
    engine.advance(1 / 60);

    const finished = engine.getSnapshot();
    expect(finished.phase).toBe("RESULT");
    expect(finished.result).toEqual(
      expect.objectContaining({
        reason: "TIMER",
        depthMeters: expect.any(Number),
        blocksBroken: expect.any(Number),
        bestCombo: expect.any(Number),
        runCoins: expect.any(Number),
        awardedCredits: expect.any(Number),
        coreShards: expect.any(Number),
        geodes: expect.any(Number),
        build: expect.any(Object),
        recordChanges: expect.any(Array),
      }),
    );
    const frozenPosition = engine.getRenderState().player.position;
    engine.advance(1);
    expect(engine.getRenderState().player.position).toEqual(frozenPosition);

    engine.dispatch({ type: "PLAY_AGAIN" });
    expect(engine.getSnapshot()).toMatchObject({
      phase: "RUNNING",
      timeRemainingSeconds: 1 / 60,
      runCoins: 0,
      result: null,
    });
    expect(engine.getRenderState().seed).not.toBe(firstSeed);
  });
});
