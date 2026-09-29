import { InputController } from "./InputController";

describe("InputController", () => {
  it("normalizes diagonal keyboard movement to unit length", () => {
    const input = new InputController();
    input.setKeyboardAction("UP", true);
    input.setKeyboardAction("RIGHT", true);

    const snapshot = input.snapshot();

    expect(Math.hypot(snapshot.moveX, snapshot.moveY)).toBeCloseTo(1, 8);
    expect(snapshot.moveX).toBeGreaterThan(0);
    expect(snapshot.moveY).toBeLessThan(0);
  });

  it("cancels opposite directions and reset clears held input", () => {
    const input = new InputController();
    input.setKeyboardAction("LEFT", true);
    input.setKeyboardAction("RIGHT", true);
    expect(input.snapshot()).toMatchObject({ moveX: 0, moveY: 0 });

    input.setKeyboardAction("DOWN", true);
    input.reset();
    expect(input.snapshot()).toEqual({ moveX: 0, moveY: 0, abilityPressed: false });
  });

  it("reports ability presses as one-shot edges", () => {
    const input = new InputController();
    input.setKeyboardAction("ABILITY", true);

    expect(input.snapshot().abilityPressed).toBe(true);
    expect(input.snapshot().abilityPressed).toBe(false);
    input.setKeyboardAction("ABILITY", true);
    expect(input.snapshot().abilityPressed).toBe(false);
    input.setKeyboardAction("ABILITY", false);
    input.setKeyboardAction("ABILITY", true);
    expect(input.snapshot().abilityPressed).toBe(true);
  });
});
