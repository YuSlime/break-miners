import { PERMANENT_UPGRADES } from "../data/permanentUpgrades";
import { createDefaultSave, parseSaveData } from "./SaveSchema";

describe("SaveSchema", () => {
  it("returns an independent safe default for invalid input", () => {
    const parsed = parseSaveData({ nope: true });
    expect(parsed.valid).toBe(false);
    expect(parsed.data).toEqual(createDefaultSave());
    expect(parsed.data).not.toBe(createDefaultSave());
  });

  it("normalizes hostile numbers, caps upgrades, deduplicates drops, and ignores unknown fields", () => {
    const parsed = parseSaveData({
      version: 1,
      credits: Number.POSITIVE_INFINITY,
      coreShards: -10,
      completedRuns: 2.8,
      upgrades: { drill_power: 999, move_speed: -2, unknown: 5 },
      records: { deepestMeters: 12.9, bestCombo: NaN, mostBlocksBroken: 8 },
      settings: {
        musicVolume: 4,
        sfxVolume: -1,
        quality: "ULTRA",
        reducedMotion: "yes",
        screenFlash: false,
        cameraShakePercent: 400,
      },
      recentDrops: Array.from({ length: 80 }, (_, index) => ({
        id: `drop-${index % 40}`,
        name: `Drop ${index}`,
        rarity: "RARE",
        foundAt: index,
      })),
      ignored: "field",
    });

    expect(parsed.valid).toBe(true);
    expect(parsed.data).toMatchObject({
      credits: 0,
      coreShards: 0,
      completedRuns: 2,
      upgrades: { drill_power: PERMANENT_UPGRADES.drill_power.maxLevel },
      records: { deepestMeters: 12, bestCombo: 0, mostBlocksBroken: 8 },
      settings: {
        musicVolume: 1,
        sfxVolume: 0,
        quality: "AUTO",
        reducedMotion: false,
        screenFlash: false,
        cameraShakePercent: 100,
      },
    });
    expect(parsed.data.recentDrops).toHaveLength(40);
    expect("unknown" in parsed.data.upgrades).toBe(false);
  });
});
