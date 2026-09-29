export class FixedStepLoop {
  readonly #stepSeconds: number;
  readonly #maxCatchUpSteps: number;
  readonly #onStep: (dt: number) => void;
  #accumulator = 0;
  #paused = false;

  constructor(
    stepSeconds: number,
    maxCatchUpSteps: number,
    onStep: (dt: number) => void,
  ) {
    if (stepSeconds <= 0 || !Number.isFinite(stepSeconds)) {
      throw new RangeError("Fixed step must be a positive finite number");
    }
    if (!Number.isInteger(maxCatchUpSteps) || maxCatchUpSteps < 1) {
      throw new RangeError("Maximum catch-up steps must be a positive integer");
    }

    this.#stepSeconds = stepSeconds;
    this.#maxCatchUpSteps = maxCatchUpSteps;
    this.#onStep = onStep;
  }

  advance(realDeltaSeconds: number): number {
    if (this.#paused || realDeltaSeconds <= 0 || !Number.isFinite(realDeltaSeconds)) {
      return 0;
    }

    const maximumDelta = this.#stepSeconds * this.#maxCatchUpSteps;
    this.#accumulator += Math.min(realDeltaSeconds, maximumDelta);

    let executed = 0;
    const epsilon = this.#stepSeconds * 1e-9;
    while (
      this.#accumulator + epsilon >= this.#stepSeconds &&
      executed < this.#maxCatchUpSteps
    ) {
      this.#onStep(this.#stepSeconds);
      this.#accumulator -= this.#stepSeconds;
      executed += 1;
    }

    if (executed === this.#maxCatchUpSteps) {
      this.#accumulator = 0;
    }

    return executed;
  }

  setPaused(paused: boolean): void {
    this.#paused = paused;
    if (paused) {
      this.#accumulator = 0;
    }
  }

  reset(): void {
    this.#accumulator = 0;
    this.#paused = false;
  }
}
