import { BALANCE } from "../data/balance";
import type { GameCommand, UISnapshot, Vec2, VisualEvent } from "./gameTypes";
import { FixedStepLoop } from "./FixedStepLoop";

export interface GameEngineOptions {
  seed?: number | string;
  runDurationSeconds?: number;
  now?: () => number;
}

export interface PlayerRenderState {
  position: Vec2;
}

export interface EngineRenderState {
  phase: UISnapshot["phase"];
  seed: number | string;
  player: PlayerRenderState;
  blocks: readonly never[];
  visualEvents: readonly VisualEvent[];
}

const INITIAL_SNAPSHOT: Omit<UISnapshot, "timeRemainingSeconds"> = {
  phase: "MENU",
  depthMeters: 0,
  level: 1,
  xp: 0,
  xpRequired: 14,
  runCoins: 0,
  coreShards: 0,
  combo: 0,
  breakGauge: 0,
  breakTimeRemainingSeconds: 0,
};

export class GameEngine {
  readonly #runDurationSeconds: number;
  readonly #loop: FixedStepLoop;
  readonly #listeners = new Set<() => void>();
  #seed: number | string;
  #snapshot: Readonly<UISnapshot>;
  #uiPublishAccumulator = 0;
  #destroyed = false;

  constructor(options: GameEngineOptions = {}) {
    this.#runDurationSeconds =
      options.runDurationSeconds ?? BALANCE.runDurationSeconds;
    this.#seed = options.seed ?? Math.floor((options.now ?? Date.now)());
    this.#snapshot = Object.freeze({
      ...INITIAL_SNAPSHOT,
      timeRemainingSeconds: this.#runDurationSeconds,
    });
    this.#loop = new FixedStepLoop(
      1 / BALANCE.simulationHz,
      8,
      (dt) => this.#step(dt),
    );
  }

  dispatch(command: GameCommand): void {
    if (this.#destroyed) return;

    switch (command.type) {
      case "START_RUN":
        this.#seed = command.seed ?? this.#seed;
        this.#setSnapshot({
          ...INITIAL_SNAPSHOT,
          phase: "RUNNING",
          timeRemainingSeconds: this.#runDurationSeconds,
        });
        this.#loop.reset();
        this.#publish();
        break;
      case "PAUSE":
        if (this.#snapshot.phase === "RUNNING") {
          this.#setSnapshot({ ...this.#snapshot, phase: "PAUSED" });
          this.#loop.setPaused(true);
          this.#publish();
        }
        break;
      case "RESUME":
        if (this.#snapshot.phase === "PAUSED") {
          this.#setSnapshot({ ...this.#snapshot, phase: "RUNNING" });
          this.#loop.setPaused(false);
          this.#publish();
        }
        break;
      case "END_RUN":
        this.#setSnapshot({ ...this.#snapshot, phase: "RESULT" });
        this.#publish();
        break;
      case "SET_INPUT":
      case "SELECT_UPGRADE":
      case "REROLL_UPGRADES":
      case "SKIP_UPGRADE":
        break;
    }
  }

  advance(realDeltaSeconds: number): void {
    if (this.#destroyed) return;
    this.#loop.advance(realDeltaSeconds);
  }

  getSnapshot = (): Readonly<UISnapshot> => this.#snapshot;

  getRenderState(): Readonly<EngineRenderState> {
    return Object.freeze({
      phase: this.#snapshot.phase,
      seed: this.#seed,
      player: Object.freeze({ position: Object.freeze({ x: 0, y: 0 }) }),
      blocks: Object.freeze([]),
      visualEvents: Object.freeze([]),
    });
  }

  subscribeSnapshot = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  setDocumentHidden(hidden: boolean): void {
    if (this.#destroyed) return;
    this.#loop.setPaused(hidden || this.#snapshot.phase === "PAUSED");
  }

  destroy(): void {
    this.#destroyed = true;
    this.#listeners.clear();
    this.#loop.setPaused(true);
  }

  #step(dt: number): void {
    if (this.#snapshot.phase !== "RUNNING") return;

    const timeRemainingSeconds = Math.max(
      0,
      this.#snapshot.timeRemainingSeconds - dt,
    );
    const phase = timeRemainingSeconds === 0 ? "RESULT" : "RUNNING";
    this.#setSnapshot({ ...this.#snapshot, phase, timeRemainingSeconds });

    this.#uiPublishAccumulator += dt;
    const publishInterval = 1 / BALANCE.uiPublishHz;
    if (this.#uiPublishAccumulator + Number.EPSILON >= publishInterval) {
      this.#uiPublishAccumulator %= publishInterval;
      this.#publish();
    }
  }

  #setSnapshot(snapshot: UISnapshot): void {
    this.#snapshot = Object.freeze(snapshot);
  }

  #publish(): void {
    this.#listeners.forEach((listener) => listener());
  }
}
