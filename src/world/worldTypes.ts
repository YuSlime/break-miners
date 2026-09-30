export type BiomeId =
  | "STONE_CAVERN"
  | "CRYSTAL_MINE"
  | "MAGMA_CORE"
  | "ANCIENT_RUINS"
  | "CYBER_DEPTHS"
  | "THE_VOID";

export type BlockType =
  | "STONE"
  | "COPPER"
  | "IRON"
  | "CRYSTAL"
  | "GOLD"
  | "GEODE"
  | "EXPLOSIVE_ROCK"
  | "CORE_GATE";

export interface BlockDefinition {
  id: BlockType;
  baseHp: number;
  xp: number;
  rewardMultiplier: number;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "SPECIAL";
  color: number;
  specialBehavior?: "EXPLODE_ON_BREAK" | "CORE_GATE";
}

export interface BlockState {
  id: string;
  type: BlockType;
  tileX: number;
  tileY: number;
  currentHp: number;
  maxHp: number;
  destroyed: boolean;
}

export interface ChunkCoordinate {
  x: number;
  y: number;
}

export interface ChunkData {
  coordinate: ChunkCoordinate;
  biome: BiomeId;
  blocks: Array<BlockState | null>;
  routeColumns: readonly number[];
}

export interface BlockDamageResult {
  block: Readonly<BlockState>;
  damageApplied: number;
  remainingHp: number;
  destroyed: boolean;
}
