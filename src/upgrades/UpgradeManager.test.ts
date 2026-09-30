import { RUN_UPGRADES, type UpgradeDefinition } from "../data/upgrades";
import { SeededRng } from "../world/SeededRng";
import {
  UpgradeManager,
  getRarityWeights,
  requiredXp,
} from "./UpgradeManager";

describe("UpgradeManager", () => {
  it("rounds the required XP formula and carries excess XP into the next level", () => {
    expect(requiredXp(1)).toBe(14);
    const manager = new UpgradeManager(RUN_UPGRADES, new SeededRng(1));

    const result = manager.addXp(17);

    expect(result).toMatchObject({
      leveledUp: true,
      level: 2,
      xp: 3,
      xpRequired: requiredXp(2),
    });
  });

  it("returns three unique reproducible eligible choices", () => {
    const first = new UpgradeManager(RUN_UPGRADES, new SeededRng("same"));
    const second = new UpgradeManager(RUN_UPGRADES, new SeededRng("same"));

    const firstChoices = first.createChoices({ luck: 0, elapsedRunSeconds: 10 });
    const secondChoices = second.createChoices({ luck: 0, elapsedRunSeconds: 10 });

    expect(firstChoices).toHaveLength(3);
    expect(new Set(firstChoices.map((choice) => choice.id)).size).toBe(3);
    expect(secondChoices).toEqual(firstChoices);
  });

  it("excludes an upgrade after it reaches maximum level", () => {
    const definitions: readonly UpgradeDefinition[] = [
      { id: "power_drill", name: "A", category: "DRILL", rarity: "COMMON", maxLevel: 1, values: [0.25], effect: "DRILL_POWER" },
      { id: "rapid_drill", name: "B", category: "DRILL", rarity: "COMMON", maxLevel: 1, values: [0.15], effect: "MINING_SPEED" },
      { id: "critical_edge", name: "C", category: "DRILL", rarity: "COMMON", maxLevel: 1, values: [0.04], effect: "CRIT_CHANCE" },
      { id: "critical_force", name: "D", category: "DRILL", rarity: "COMMON", maxLevel: 1, values: [0.4], effect: "CRIT_DAMAGE" },
    ];
    const manager = new UpgradeManager(definitions, new SeededRng(2));
    const choices = manager.createChoices({ luck: 0, elapsedRunSeconds: 100 });
    const maxed = choices[0];
    manager.select(maxed.id);

    const next = manager.createChoices({ luck: 0, elapsedRunSeconds: 100 });
    expect(next.map((choice) => choice.id)).not.toContain(maxed.id);
  });

  it("increasing luck never lowers the combined rare-or-better weight", () => {
    for (const luck of [0, 0.2, 0.5, 1, 2]) {
      const lower = getRarityWeights(luck);
      const higher = getRarityWeights(luck + 0.1);
      const rareOrBetter = (weights: typeof lower) =>
        weights.RARE + weights.EPIC + weights.LEGENDARY + weights.MYTHIC;
      expect(rareOrBetter(higher)).toBeGreaterThanOrEqual(rareOrBetter(lower));
    }
  });

  it("allows one reroll and converts skip into run coins", () => {
    const manager = new UpgradeManager(RUN_UPGRADES, new SeededRng(77));
    const context = { luck: 0, elapsedRunSeconds: 90 };
    const original = manager.createChoices(context);

    const rerolled = manager.reroll(context);

    expect(rerolled.accepted).toBe(true);
    expect(rerolled.choices).toHaveLength(3);
    expect(rerolled.choices).not.toEqual(original);
    expect(manager.reroll(context)).toMatchObject({ accepted: false });
    expect(manager.skip()).toEqual({ accepted: true, runCoinsAwarded: 5 });
  });
});
