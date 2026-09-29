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
});
