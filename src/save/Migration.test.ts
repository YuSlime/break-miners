import { migrateSave } from "./Migration";

describe("save migration", () => {
  it("migrates a version-zero save without losing progression or settings", () => {
    const result = migrateSave({
      version: 0,
      credits: 42,
      coreShards: 3,
      upgrades: { drill_power: 2 },
      records: { deepestMeters: 210, bestCombo: 18, mostBlocksBroken: 80 },
      settings: { musicVolume: 0.4, sfxVolume: 0.7, reducedMotion: true },
    });

    expect(result.valid).toBe(true);
    expect(result.data).toMatchObject({
      version: 1,
      credits: 42,
      coreShards: 3,
      upgrades: { drill_power: 2 },
      records: { deepestMeters: 210, bestCombo: 18, mostBlocksBroken: 80 },
      settings: { musicVolume: 0.4, sfxVolume: 0.7, reducedMotion: true },
    });
  });
});
