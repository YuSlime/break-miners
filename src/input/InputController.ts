import type { InputSnapshot } from "../game/gameTypes";

export type InputAction = "UP" | "DOWN" | "LEFT" | "RIGHT" | "ABILITY";

function normalized(x: number, y: number): readonly [number, number] {
  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) return [0, 0];
  if (magnitude <= 1) return [x, y];
  return [x / magnitude, y / magnitude];
}

export class InputController {
  readonly #actions = new Set<InputAction>();
  #touchX = 0;
  #touchY = 0;
  #abilityEdge = false;

  setKeyboardAction(action: InputAction, pressed: boolean): void {
    const wasPressed = this.#actions.has(action);
    if (pressed) this.#actions.add(action);
    else this.#actions.delete(action);

    if (action === "ABILITY" && pressed && !wasPressed) {
      this.#abilityEdge = true;
    }
  }

  setTouchVector(x: number, y: number): void {
    [this.#touchX, this.#touchY] = normalized(x, y);
  }

  releaseTouch(): void {
    this.#touchX = 0;
    this.#touchY = 0;
  }

  reset(): void {
    this.#actions.clear();
    this.releaseTouch();
    this.#abilityEdge = false;
  }

  snapshot(): InputSnapshot {
    const keyboardX =
      Number(this.#actions.has("RIGHT")) - Number(this.#actions.has("LEFT"));
    const keyboardY =
      Number(this.#actions.has("DOWN")) - Number(this.#actions.has("UP"));
    const [moveX, moveY] = normalized(
      keyboardX + this.#touchX,
      keyboardY + this.#touchY,
    );
    const abilityPressed = this.#abilityEdge;
    this.#abilityEdge = false;
    return { moveX, moveY, abilityPressed };
  }
}
