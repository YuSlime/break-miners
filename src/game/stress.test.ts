import { BreakPipeline } from "../combat/BreakPipeline";
import type { BlockState } from "../world/worldTypes";
import { GameEngine } from "./GameEngine";

describe("deterministic stress gate", () => {
  it("processes 2,000 queued effect breaks within tick, depth, and uniqueness caps", () => {
    const pipeline = new BreakPipeline();
    const blocks: BlockState[] = Array.from({ length: 2_000 }, (_, index) => ({
      id: `dense-${index}`,
      type: index % 2 === 0 ? "EXPLOSIVE_ROCK" : "CRYSTAL",
      tileX: index % 50,
      tileY: Math.floor(index / 50),
      currentHp: 0,
      maxHp: 1,
      destroyed: true,
    }));
    blocks.forEach((block) => {
      pipeline.enqueue({ block, chainDepth: 8 });
      pipeline.enqueue({ block, chainDepth: 8 });
    });
    pipeline.enqueue({
      block: { ...blocks[0]!, id: "too-deep" },
      chainDepth: 9,
    });

    let maxBreaksObservedPerTick = 0;
    let totalRewardEvents = 0;
    let maxChainDepthObserved = 0;
    const rewardedBlockIds = new Set<string>();
    let pending = 1;
    while (pending > 0) {
      const result = pipeline.processTick({
        emit: (event, request) => {
          if (event === "BLOCK_DESTROYED") {
            maxChainDepthObserved = Math.max(maxChainDepthObserved, request.chainDepth);
            totalRewardEvents += 1;
            rewardedBlockIds.add(request.block.id);
          }
        },
      });
      maxBreaksObservedPerTick = Math.max(maxBreaksObservedPerTick, result.processed);
      pending = result.pending;
    }

    expect(maxBreaksObservedPerTick).toBeLessThanOrEqual(150);
    expect(maxChainDepthObserved).toBeLessThanOrEqual(8);
    expect(rewardedBlockIds.size).toBe(totalRewardEvents);
    expect(rewardedBlockIds.size).toBe(2_000);
    expect(rewardedBlockIds.has("too-deep")).toBe(false);
  });

  it("produces equal gameplay state when driven at 30 FPS and 60 FPS", () => {
    const run = (fps: 30 | 60) => {
      const engine = new GameEngine({ seed: "frame-invariant", runDurationSeconds: 20 });
      engine.dispatch({ type: "START_RUN" });
      const before = new Set(engine.getRenderState().blocks.map((block) => block.id));
      engine.dispatch({
        type: "SET_INPUT",
        input: { moveX: 1, moveY: 0, abilityPressed: false },
      });
      for (let frame = 0; frame < fps * 3; frame += 1) engine.advance(1 / fps);
      const state = engine.getRenderState();
      const after = new Set(state.blocks.map((block) => block.id));
      return {
        destroyedBlockIds: [...before].filter((id) => !after.has(id)).sort(),
        snapshot: engine.getSnapshot(),
        build: engine.getRunBuild(),
        position: state.player.position,
      };
    };

    const at30 = run(30);
    const at60 = run(60);
    expect(at30.destroyedBlockIds).toEqual(at60.destroyedBlockIds);
    expect(at30.snapshot).toEqual(at60.snapshot);
    expect(at30.build).toEqual(at60.build);
    expect(at30.position.x).toBeCloseTo(at60.position.x, 8);
    expect(at30.position.y).toBeCloseTo(at60.position.y, 8);
    expect(at30.snapshot.phase).not.toBe("BOOT");
  });
});
