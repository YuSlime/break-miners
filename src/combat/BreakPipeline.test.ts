import type { BlockState } from "../world/worldTypes";
import { BreakPipeline, type BreakEventName } from "./BreakPipeline";

function block(index: number): BlockState {
  return {
    id: `block-${index}`,
    type: index % 5 === 0 ? "GOLD" : "STONE",
    tileX: index,
    tileY: 0,
    currentHp: 0,
    maxHp: 10,
    destroyed: true,
  };
}

describe("BreakPipeline", () => {
  it("emits block-break effects in the required order", () => {
    const pipeline = new BreakPipeline();
    const events: BreakEventName[] = [];
    pipeline.enqueue({ block: block(1), chainDepth: 0 });

    pipeline.processTick({ emit: (event) => events.push(event) });

    expect(events).toEqual([
      "BLOCK_DESTROYED",
      "XP_AWARDED",
      "RUN_COINS_AWARDED",
      "COMBO_UPDATED",
      "BREAK_GAUGE_UPDATED",
      "ON_BREAK_ENQUEUED",
      "LOOT_ROLLED",
      "VISUAL_EVENT_EMITTED",
    ]);
  });

  it("processes at most 150 unique breaks per tick and carries the remainder", () => {
    const pipeline = new BreakPipeline();
    for (let index = 0; index < 151; index += 1) {
      pipeline.enqueue({ block: block(index), chainDepth: 0 });
    }
    pipeline.enqueue({ block: block(0), chainDepth: 0 });

    const first = pipeline.processTick({ emit: () => undefined });
    const second = pipeline.processTick({ emit: () => undefined });

    expect(first.processed).toBe(150);
    expect(first.pending).toBe(1);
    expect(second.processed).toBe(1);
    expect(second.pending).toBe(0);
    expect(
      new Set([...first.rewardedBlockIds, ...second.rewardedBlockIds]).size,
    ).toBe(151);
  });

  it("rejects requests beyond maximum chain depth", () => {
    const pipeline = new BreakPipeline();
    pipeline.enqueue({ block: block(1), chainDepth: 9 });

    expect(pipeline.processTick({ emit: () => undefined })).toMatchObject({
      processed: 0,
      pending: 0,
    });
  });
});
