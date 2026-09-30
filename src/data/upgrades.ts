export type UpgradeCategory = "DRILL" | "BOMB" | "LIGHTNING" | "DRONE";
export type UpgradeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
export type UpgradeEffect =
  | "DRILL_POWER"
  | "MINING_SPEED"
  | "CRIT_CHANCE"
  | "CRIT_DAMAGE"
  | "PIERCE"
  | "BOMB_CHANCE"
  | "BOMB_RADIUS"
  | "BOMB_DAMAGE"
  | "MULTI_BOMB"
  | "CLUSTER_BOMB"
  | "STATIC_HIT"
  | "LIGHTNING_TARGETS"
  | "LIGHTNING_DAMAGE"
  | "THUNDERSTORM"
  | "DRONE_COUNT"
  | "DRONE_SPEED"
  | "DRONE_DAMAGE"
  | "DRONE_CAP"
  | "LASER_DRONE"
  | "NUCLEAR_BOMB"
  | "THUNDER_GOD"
  | "DRONE_ARMY";

export type UpgradeId =
  | "power_drill"
  | "rapid_drill"
  | "critical_edge"
  | "critical_force"
  | "piercing_drill"
  | "mini_bomb"
  | "bigger_boom"
  | "high_explosive"
  | "multi_bomb"
  | "cluster_bomb"
  | "static_hit"
  | "chain_lightning"
  | "overvolt"
  | "thunderstorm"
  | "mining_drone"
  | "rapid_drone"
  | "power_drone"
  | "swarm"
  | "laser_drone"
  | "nuclear_bomb"
  | "thunder_god"
  | "drone_army";

export interface UpgradePrerequisite {
  id: UpgradeId;
  level: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  category: UpgradeCategory;
  rarity: UpgradeRarity;
  maxLevel: number;
  values: readonly number[];
  effect: UpgradeEffect;
  description?: string;
  evolution?: boolean;
  prerequisites?: readonly UpgradePrerequisite[];
}

const repeated = (step: number, levels = 5): readonly number[] =>
  Array.from({ length: levels }, (_, index) => step * (index + 1));

export const STANDARD_UPGRADES: readonly UpgradeDefinition[] = [
  { id: "power_drill", name: "POWER DRILL", category: "DRILL", rarity: "COMMON", maxLevel: 5, values: repeated(0.25), effect: "DRILL_POWER", description: "Drill Power +25%" },
  { id: "rapid_drill", name: "RAPID DRILL", category: "DRILL", rarity: "COMMON", maxLevel: 5, values: repeated(0.15), effect: "MINING_SPEED", description: "Mining Speed +15%" },
  { id: "critical_edge", name: "CRITICAL EDGE", category: "DRILL", rarity: "RARE", maxLevel: 5, values: repeated(0.04), effect: "CRIT_CHANCE", description: "Critical Chance +4%" },
  { id: "critical_force", name: "CRITICAL FORCE", category: "DRILL", rarity: "RARE", maxLevel: 5, values: repeated(0.4), effect: "CRIT_DAMAGE", description: "Critical Damage +40%" },
  { id: "piercing_drill", name: "PIERCING DRILL", category: "DRILL", rarity: "EPIC", maxLevel: 5, values: repeated(0.2), effect: "PIERCE", description: "Breaks can damage the next block" },
  { id: "mini_bomb", name: "MINI BOMB", category: "BOMB", rarity: "COMMON", maxLevel: 5, values: repeated(0.1), effect: "BOMB_CHANCE", description: "Block breaks can explode" },
  { id: "bigger_boom", name: "BIGGER BOOM", category: "BOMB", rarity: "RARE", maxLevel: 5, values: repeated(0.25), effect: "BOMB_RADIUS", description: "Explosion Radius +25%" },
  { id: "high_explosive", name: "HIGH EXPLOSIVE", category: "BOMB", rarity: "RARE", maxLevel: 5, values: repeated(0.4), effect: "BOMB_DAMAGE", description: "Explosion Damage +40%" },
  { id: "multi_bomb", name: "MULTI BOMB", category: "BOMB", rarity: "EPIC", maxLevel: 5, values: repeated(0.2), effect: "MULTI_BOMB", description: "Bombs can trigger another bomb" },
  { id: "cluster_bomb", name: "CLUSTER BOMB", category: "BOMB", rarity: "LEGENDARY", maxLevel: 1, values: [4], effect: "CLUSTER_BOMB", description: "Explosions launch four cluster bombs" },
  { id: "static_hit", name: "STATIC HIT", category: "LIGHTNING", rarity: "COMMON", maxLevel: 1, values: [1], effect: "STATIC_HIT", description: "Critical hits create lightning" },
  { id: "chain_lightning", name: "CHAIN LIGHTNING", category: "LIGHTNING", rarity: "RARE", maxLevel: 5, values: [3, 4, 5, 6, 7], effect: "LIGHTNING_TARGETS", description: "Lightning chains to more blocks" },
  { id: "overvolt", name: "OVERVOLT", category: "LIGHTNING", rarity: "RARE", maxLevel: 5, values: repeated(0.4), effect: "LIGHTNING_DAMAGE", description: "Lightning Damage +40%" },
  { id: "thunderstorm", name: "THUNDERSTORM", category: "LIGHTNING", rarity: "LEGENDARY", maxLevel: 1, values: [8], effect: "THUNDERSTORM", description: "Repeated lightning summons a storm" },
  { id: "mining_drone", name: "MINING DRONE", category: "DRONE", rarity: "COMMON", maxLevel: 5, values: [1, 2, 3, 4, 5], effect: "DRONE_COUNT", description: "Mining Drone +1" },
  { id: "rapid_drone", name: "RAPID DRONE", category: "DRONE", rarity: "RARE", maxLevel: 5, values: repeated(0.25), effect: "DRONE_SPEED", description: "Drone Attack Speed +25%" },
  { id: "power_drone", name: "POWER DRONE", category: "DRONE", rarity: "RARE", maxLevel: 5, values: repeated(0.35), effect: "DRONE_DAMAGE", description: "Drone Damage +35%" },
  { id: "swarm", name: "SWARM", category: "DRONE", rarity: "EPIC", maxLevel: 2, values: [2, 4], effect: "DRONE_CAP", description: "Maximum Drones +2" },
  { id: "laser_drone", name: "LASER DRONE", category: "DRONE", rarity: "LEGENDARY", maxLevel: 1, values: [1], effect: "LASER_DRONE", description: "Drones fire mining lasers" },
];

export const EVOLUTIONS: readonly UpgradeDefinition[] = [
  { id: "nuclear_bomb", name: "NUCLEAR BOMB", category: "BOMB", rarity: "MYTHIC", maxLevel: 1, values: [0.05], effect: "NUCLEAR_BOMB", description: "5% chance for a massive queued explosion", evolution: true, prerequisites: [{ id: "mini_bomb", level: 5 }, { id: "bigger_boom", level: 3 }] },
  { id: "thunder_god", name: "THUNDER GOD", category: "LIGHTNING", rarity: "MYTHIC", maxLevel: 1, values: [12], effect: "THUNDER_GOD", description: "Lightning chains up to 12 times", evolution: true, prerequisites: [{ id: "chain_lightning", level: 5 }, { id: "overvolt", level: 3 }] },
  { id: "drone_army", name: "DRONE ARMY", category: "DRONE", rarity: "MYTHIC", maxLevel: 1, values: [5], effect: "DRONE_ARMY", description: "Deploy five additional drones", evolution: true, prerequisites: [{ id: "mining_drone", level: 5 }, { id: "rapid_drone", level: 3 }] },
];

export const RUN_UPGRADES: readonly UpgradeDefinition[] = [
  ...STANDARD_UPGRADES,
  ...EVOLUTIONS,
];
