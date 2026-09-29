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
