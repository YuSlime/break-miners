import { InputController, type InputAction } from "./InputController";

const KEY_ACTIONS: Readonly<Record<string, InputAction | undefined>> = {
  KeyW: "UP",
  ArrowUp: "UP",
  KeyS: "DOWN",
  ArrowDown: "DOWN",
  KeyA: "LEFT",
  ArrowLeft: "LEFT",
  KeyD: "RIGHT",
  ArrowRight: "RIGHT",
  Space: "ABILITY",
};

export class KeyboardInput {
  readonly #controller: InputController;
  readonly #target: Window;

  constructor(controller: InputController, target: Window = window) {
    this.#controller = controller;
    this.#target = target;
    target.addEventListener("keydown", this.#onKeyDown);
    target.addEventListener("keyup", this.#onKeyUp);
    target.addEventListener("blur", this.#onBlur);
  }

  destroy(): void {
    this.#target.removeEventListener("keydown", this.#onKeyDown);
    this.#target.removeEventListener("keyup", this.#onKeyUp);
    this.#target.removeEventListener("blur", this.#onBlur);
    this.#controller.reset();
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    event.preventDefault();
    this.#controller.setKeyboardAction(action, true);
  };

  readonly #onKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    event.preventDefault();
    this.#controller.setKeyboardAction(action, false);
  };

  readonly #onBlur = (): void => this.#controller.reset();
}
