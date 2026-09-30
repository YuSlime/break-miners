import { BALANCE } from "../data/balance";

const MILESTONES = [10, 25, 50, 100, 250, 500] as const;

export interface ComboState {
  combo: number;
  bestCombo: number;
  idleSeconds: number;
}

export class ComboSystem {
  #combo = 0;
  #bestCombo = 0;
  #idleSeconds = 0;
  readonly #emitted = new Set<number>();

  onBreak(count = 1): { milestones: readonly number[]; state: Readonly<ComboState> } {
    const before = this.#combo;
    this.#combo += Math.max(0, count);
    this.#bestCombo = Math.max(this.#bestCombo, this.#combo);
    this.#idleSeconds = 0;
    const milestones = MILESTONES.filter(
      (milestone) =>
        before < milestone &&
        this.#combo >= milestone &&
        !this.#emitted.has(milestone),
    );
    milestones.forEach((milestone) => this.#emitted.add(milestone));
    return { milestones, state: this.getState() };
  }

  step(dt: number): Readonly<ComboState> {
    if (this.#combo <= 0) return this.getState();
    this.#idleSeconds += Math.max(0, dt);
    if (this.#idleSeconds > BALANCE.comboDecayDelaySeconds) {
      this.#combo = Math.max(0, this.#combo - dt * 10);
    }
    return this.getState();
  }

  reset(): void {
    this.#combo = 0;
    this.#bestCombo = 0;
    this.#idleSeconds = 0;
    this.#emitted.clear();
  }

  getState(): Readonly<ComboState> {
    return Object.freeze({
      combo: this.#combo,
      bestCombo: this.#bestCombo,
      idleSeconds: this.#idleSeconds,
    });
  }
}
