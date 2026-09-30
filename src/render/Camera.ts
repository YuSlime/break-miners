import type { Vec2 } from "../game/gameTypes";

export interface CameraOptions {
  maxShake: number;
  reducedMotion: boolean;
  lookAheadSeconds?: number;
}

export interface CameraState {
  center: Vec2;
  shakeAmplitude: number;
}

export class Camera {
  readonly #maxShake: number;
  readonly #lookAheadSeconds: number;
  #reducedMotion: boolean;
  #center: Vec2 = { x: 0, y: 0 };
  #shakeAmplitude = 0;

  constructor(options: CameraOptions) {
    this.#maxShake = Math.max(0, options.maxShake);
    this.#lookAheadSeconds = options.lookAheadSeconds ?? 0.16;
    this.#reducedMotion = options.reducedMotion;
  }

  follow(position: Vec2, velocity: Vec2): void {
    this.#center = {
      x: position.x + velocity.x * this.#lookAheadSeconds,
      y: position.y + velocity.y * this.#lookAheadSeconds,
    };
  }

  requestShake(amplitude: number): void {
    if (this.#reducedMotion) return;
    this.#shakeAmplitude = Math.min(
      this.#maxShake,
      this.#shakeAmplitude + Math.max(0, amplitude),
    );
  }

  decayShake(factor = 0.84): void {
    this.#shakeAmplitude *= Math.max(0, Math.min(1, factor));
    if (this.#shakeAmplitude < 0.05) this.#shakeAmplitude = 0;
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.#reducedMotion = reducedMotion;
    if (reducedMotion) this.#shakeAmplitude = 0;
  }

  getState(): Readonly<CameraState> {
    return Object.freeze({
      center: Object.freeze({ ...this.#center }),
      shakeAmplitude: this.#reducedMotion ? 0 : this.#shakeAmplitude,
    });
  }
}
