import { FixedStepLoop } from "./FixedStepLoop";

describe("FixedStepLoop", () => {
  it("runs the exact number of fixed steps represented by real time", () => {
    const step = vi.fn();
    const loop = new FixedStepLoop(1 / 60, 5, step);

    const executed = loop.advance(1 / 30);

    expect(executed).toBe(2);
    expect(step).toHaveBeenCalledTimes(2);
    expect(step).toHaveBeenNthCalledWith(1, 1 / 60);
  });

  it("does not accumulate elapsed time while paused", () => {
    const step = vi.fn();
    const loop = new FixedStepLoop(1 / 60, 5, step);

    loop.advance(1 / 30);
    loop.setPaused(true);
    loop.advance(300);
    loop.setPaused(false);
    loop.advance(1 / 60);

    expect(step).toHaveBeenCalledTimes(3);
  });

  it("caps catch-up work after a long frame", () => {
    const step = vi.fn();
    const loop = new FixedStepLoop(1 / 60, 5, step);

    const executed = loop.advance(1);

    expect(executed).toBe(5);
    expect(step).toHaveBeenCalledTimes(5);
  });
});
