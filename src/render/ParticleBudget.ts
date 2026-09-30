export type ParticleQuality = "AUTO" | "LOW" | "MEDIUM" | "HIGH";
export type DeviceClass = "MOBILE" | "DESKTOP";

export interface ParticleBudgetOptions {
  deviceClass: DeviceClass;
  quality: ParticleQuality;
}

export interface RenderQualitySettings extends ParticleBudgetOptions {
  reducedMotion: boolean;
  screenFlash: boolean;
  cameraShakePercent: number;
}

const LIMITS: Readonly<Record<DeviceClass, Readonly<Record<ParticleQuality, number>>>> = {
  MOBILE: { AUTO: 400, LOW: 300, MEDIUM: 400, HIGH: 500 },
  DESKTOP: { AUTO: 1_200, LOW: 700, MEDIUM: 1_200, HIGH: 2_000 },
};

export function particleLimit(options: ParticleBudgetOptions): number {
  return LIMITS[options.deviceClass][options.quality];
}

export class AutoQualityController {
  #quality: Exclude<ParticleQuality, "AUTO"> = "MEDIUM";
  #lowSeconds = 0;
  #healthySeconds = 0;

  sample(fps: number, elapsedSeconds: number): Exclude<ParticleQuality, "AUTO"> {
    const elapsed = Math.max(0, elapsedSeconds);
    if (fps < 40) {
      this.#lowSeconds += elapsed;
      this.#healthySeconds = 0;
      if (this.#lowSeconds >= 3) this.#quality = "LOW";
    } else if (fps >= 55) {
      this.#healthySeconds += elapsed;
      this.#lowSeconds = 0;
      if (this.#healthySeconds >= 6) this.#quality = "MEDIUM";
    } else {
      this.#lowSeconds = 0;
      this.#healthySeconds = 0;
    }
    return this.#quality;
  }

  getQuality(): Exclude<ParticleQuality, "AUTO"> {
    return this.#quality;
  }
}
