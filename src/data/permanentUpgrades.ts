import type { SaveData } from "../save/saveTypes";

export type PermanentUpgradeId =
  | "drill_power"
  | "move_speed"
  | "crit_chance"
  | "crit_damage"
  | "luck"
  | "magnet"
  | "starting_xp"
  | "core_bonus";

export interface PermanentUpgradeDefinition {
  id: PermanentUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  valuePerLevel: number;
  unit: "PERCENT" | "FLAT";
}

export const PERMANENT_UPGRADES: Readonly<
  Record<PermanentUpgradeId, PermanentUpgradeDefinition>
> = Object.freeze({
  drill_power: { id: "drill_power", name: "DRILL POWER", description: "+8% drill power", maxLevel: 20, baseCost: 10, valuePerLevel: 0.08, unit: "PERCENT" },
  move_speed: { id: "move_speed", name: "MOVE SPEED", description: "+2% move speed", maxLevel: 15, baseCost: 10, valuePerLevel: 0.02, unit: "PERCENT" },
  crit_chance: { id: "crit_chance", name: "CRIT CHANCE", description: "+1 percentage point", maxLevel: 10, baseCost: 14, valuePerLevel: 0.01, unit: "PERCENT" },
  crit_damage: { id: "crit_damage", name: "CRIT DAMAGE", description: "+8% critical damage", maxLevel: 15, baseCost: 16, valuePerLevel: 0.08, unit: "PERCENT" },
  luck: { id: "luck", name: "LUCK", description: "+4% luck", maxLevel: 15, baseCost: 18, valuePerLevel: 0.04, unit: "PERCENT" },
  magnet: { id: "magnet", name: "MAGNET", description: "+6% pickup reach", maxLevel: 10, baseCost: 12, valuePerLevel: 0.06, unit: "PERCENT" },
  starting_xp: { id: "starting_xp", name: "STARTING XP", description: "+2 starting XP", maxLevel: 10, baseCost: 20, valuePerLevel: 2, unit: "FLAT" },
  core_bonus: { id: "core_bonus", name: "CORE BONUS", description: "+5% Core rewards", maxLevel: 10, baseCost: 25, valuePerLevel: 0.05, unit: "PERCENT" },
});

export function permanentUpgradeCost(id: PermanentUpgradeId, level: number): number {
  const definition = PERMANENT_UPGRADES[id];
  return Math.round(definition.baseCost * Math.pow(1.75, Math.max(0, level)));
}

export interface PermanentPurchaseResult {
  accepted: boolean;
  reason?: "INSUFFICIENT_CREDITS" | "MAX_LEVEL";
  cost: number;
  data: SaveData;
}

export function purchasePermanentUpgrade(
  save: Readonly<SaveData>,
  id: PermanentUpgradeId,
): PermanentPurchaseResult {
  const definition = PERMANENT_UPGRADES[id];
  const level = save.upgrades[id] ?? 0;
  const cost = permanentUpgradeCost(id, level);
  if (level >= definition.maxLevel) {
    return { accepted: false, reason: "MAX_LEVEL", cost, data: structuredClone(save) };
  }
  if (save.credits < cost) {
    return { accepted: false, reason: "INSUFFICIENT_CREDITS", cost, data: structuredClone(save) };
  }
  return {
    accepted: true,
    cost,
    data: {
      ...structuredClone(save),
      credits: save.credits - cost,
      upgrades: { ...save.upgrades, [id]: level + 1 },
    },
  };
}
