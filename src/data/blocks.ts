import type { BiomeId, BlockDefinition, BlockType } from "../world/worldTypes";

export const BLOCK_DEFINITIONS: Readonly<Record<BlockType, BlockDefinition>> = {
  STONE: { id: "STONE", baseHp: 10, xp: 1, rewardMultiplier: 1, rarity: "COMMON", color: 0x667080 },
  COPPER: { id: "COPPER", baseHp: 18, xp: 2, rewardMultiplier: 1.3, rarity: "UNCOMMON", color: 0xc47a52 },
  IRON: { id: "IRON", baseHp: 30, xp: 3, rewardMultiplier: 1.6, rarity: "UNCOMMON", color: 0x9aabb8 },
  CRYSTAL: { id: "CRYSTAL", baseHp: 45, xp: 5, rewardMultiplier: 2.2, rarity: "RARE", color: 0x4be8ff },
  GOLD: { id: "GOLD", baseHp: 65, xp: 8, rewardMultiplier: 4, rarity: "RARE", color: 0xffd35a },
  GEODE: { id: "GEODE", baseHp: 120, xp: 15, rewardMultiplier: 5, rarity: "SPECIAL", color: 0xa66dff },
  EXPLOSIVE_ROCK: { id: "EXPLOSIVE_ROCK", baseHp: 48, xp: 4, rewardMultiplier: 1.8, rarity: "RARE", color: 0xff693d, specialBehavior: "EXPLODE_ON_BREAK" },
  CORE_GATE: { id: "CORE_GATE", baseHp: 1_000, xp: 50, rewardMultiplier: 10, rarity: "SPECIAL", color: 0xff477e, specialBehavior: "CORE_GATE" },
};

export const BIOME_BLOCK_WEIGHTS: Readonly<
  Record<BiomeId, readonly [BlockType, number][]>
> = {
  STONE_CAVERN: [["STONE", 68], ["COPPER", 20], ["IRON", 8], ["CRYSTAL", 2], ["GEODE", 1], ["EXPLOSIVE_ROCK", 1]],
  CRYSTAL_MINE: [["STONE", 40], ["IRON", 20], ["CRYSTAL", 28], ["GOLD", 5], ["GEODE", 4], ["EXPLOSIVE_ROCK", 3]],
  MAGMA_CORE: [["STONE", 28], ["IRON", 24], ["GOLD", 10], ["CRYSTAL", 12], ["EXPLOSIVE_ROCK", 22], ["GEODE", 4]],
  ANCIENT_RUINS: [["STONE", 30], ["IRON", 30], ["GOLD", 14], ["CRYSTAL", 14], ["EXPLOSIVE_ROCK", 7], ["GEODE", 5]],
  CYBER_DEPTHS: [["IRON", 38], ["CRYSTAL", 24], ["GOLD", 18], ["STONE", 10], ["EXPLOSIVE_ROCK", 5], ["GEODE", 5]],
  THE_VOID: [["STONE", 18], ["IRON", 20], ["CRYSTAL", 24], ["GOLD", 22], ["EXPLOSIVE_ROCK", 8], ["GEODE", 8]],
};
