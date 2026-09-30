import type {
  UpgradeDefinition,
  UpgradeId,
  UpgradeRarity,
} from "../data/upgrades";
import { SeededRng } from "../world/SeededRng";
import {
  deriveRunStats,
  type BaseRunStats,
  type DerivedRunStats,
} from "./UpgradeEffects";

export type RunBuild = Partial<Record<UpgradeId, number>>;

export interface UpgradeChoiceContext {
  luck: number;
  elapsedRunSeconds: number;
}

export interface UpgradeChoice {
  id: UpgradeId;
  name: string;
  category: UpgradeDefinition["category"];
  rarity: UpgradeRarity;
  currentLevel: number;
  nextLevel: number;
  effectValue: number;
  description: string;
  evolution: boolean;
}

export interface LevelProgressResult {
  leveledUp: boolean;
  level: number;
  xp: number;
  xpRequired: number;
}

export interface UpgradeChoiceResult {
  accepted: boolean;
  choices: readonly UpgradeChoice[];
  rerollsRemaining: number;
}

export interface UpgradeSelectionResult {
  accepted: boolean;
  id?: UpgradeId;
  level?: number;
}

export interface UpgradeSkipResult {
  accepted: boolean;
  runCoinsAwarded: number;
}

const BASE_RARITY_WEIGHTS: Readonly<Record<UpgradeRarity, number>> = {
  COMMON: 55,
  RARE: 27,
  EPIC: 12,
  LEGENDARY: 5,
  MYTHIC: 1,
};

export function requiredXp(level: number): number {
  return Math.ceil(10 + Math.pow(Math.max(1, level), 1.45) * 4);
}

export function getRarityWeights(
  luck: number,
): Readonly<Record<UpgradeRarity, number>> {
  const safeLuck = Math.max(0, luck);
  const raw: Record<UpgradeRarity, number> = {
    COMMON: BASE_RARITY_WEIGHTS.COMMON,
    RARE: BASE_RARITY_WEIGHTS.RARE * (1 + safeLuck * 0.8),
    EPIC: BASE_RARITY_WEIGHTS.EPIC * (1 + safeLuck * 1.2),
    LEGENDARY: BASE_RARITY_WEIGHTS.LEGENDARY * (1 + safeLuck * 1.6),
    MYTHIC: BASE_RARITY_WEIGHTS.MYTHIC * (1 + safeLuck * 2),
  };
  const total = Object.values(raw).reduce((sum, weight) => sum + weight, 0);
  return {
    COMMON: raw.COMMON / total,
    RARE: raw.RARE / total,
    EPIC: raw.EPIC / total,
    LEGENDARY: raw.LEGENDARY / total,
    MYTHIC: raw.MYTHIC / total,
  };
}

export class UpgradeManager {
  readonly #definitions: readonly UpgradeDefinition[];
  readonly #definitionsById: ReadonlyMap<UpgradeId, UpgradeDefinition>;
  readonly #rng: SeededRng;
  readonly #build: RunBuild = {};
  #level = 1;
  #xp = 0;
  #rerollsRemaining = 1;
  #activeChoices: readonly UpgradeChoice[] = [];

  constructor(definitions: readonly UpgradeDefinition[], rng: SeededRng) {
    this.#definitions = definitions;
    this.#definitionsById = new Map(
      definitions.map((definition) => [definition.id, definition]),
    );
    this.#rng = rng;
  }

  addXp(amount: number): LevelProgressResult {
    this.#xp += Math.max(0, amount);
    const threshold = requiredXp(this.#level);
    let leveledUp = false;
    if (this.#xp >= threshold) {
      this.#xp -= threshold;
      this.#level += 1;
      leveledUp = true;
    }
    return {
      leveledUp,
      level: this.#level,
      xp: this.#xp,
      xpRequired: requiredXp(this.#level),
    };
  }

  createChoices(
    context: UpgradeChoiceContext,
  ): readonly [UpgradeChoice, UpgradeChoice, UpgradeChoice] {
    const eligible = this.#eligibleDefinitions();
    if (eligible.length < 3) {
      throw new Error("At least three eligible upgrades are required");
    }

    const selected: UpgradeDefinition[] = [];
    const remaining = [...eligible];
    const rarityWeights = getRarityWeights(context.luck);
    while (selected.length < 3) {
      const weights = remaining.map((definition) => {
        const firstMinuteBias =
          context.elapsedRunSeconds < 60 &&
          (definition.category === "BOMB" || definition.category === "LIGHTNING")
            ? 1.5
            : 1;
        const evolutionBias = definition.evolution ? 2.5 : 1;
        return rarityWeights[definition.rarity] * firstMinuteBias * evolutionBias;
      });
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let roll = this.#rng.next() * total;
      let selectedIndex = remaining.length - 1;
      for (let index = 0; index < remaining.length; index += 1) {
        roll -= weights[index]!;
        if (roll < 0) {
          selectedIndex = index;
          break;
        }
      }
      selected.push(remaining[selectedIndex]!);
      remaining.splice(selectedIndex, 1);
    }

    const choices = selected.map((definition) => this.#toChoice(definition)) as [
      UpgradeChoice,
      UpgradeChoice,
      UpgradeChoice,
    ];
    this.#activeChoices = choices;
    return choices;
  }

  reroll(context: UpgradeChoiceContext): UpgradeChoiceResult {
    if (this.#rerollsRemaining <= 0 || this.#activeChoices.length === 0) {
      return {
        accepted: false,
        choices: this.#activeChoices,
        rerollsRemaining: this.#rerollsRemaining,
      };
    }
    const previousIds = this.#activeChoices.map((choice) => choice.id).join(":");
    this.#rerollsRemaining -= 1;
    let choices = this.createChoices(context);
    for (
      let attempt = 0;
      attempt < 2 && choices.map((choice) => choice.id).join(":") === previousIds;
      attempt += 1
    ) {
      choices = this.createChoices(context);
    }
    return { accepted: true, choices, rerollsRemaining: 0 };
  }

  select(id: UpgradeId): UpgradeSelectionResult {
    const choice = this.#activeChoices.find((candidate) => candidate.id === id);
    if (!choice) return { accepted: false };
    const definition = this.#definitionsById.get(id);
    if (!definition) return { accepted: false };
    const nextLevel = Math.min(definition.maxLevel, (this.#build[id] ?? 0) + 1);
    this.#build[id] = nextLevel;
    this.#activeChoices = [];
    return { accepted: true, id, level: nextLevel };
  }

  skip(): UpgradeSkipResult {
    if (this.#activeChoices.length === 0) {
      return { accepted: false, runCoinsAwarded: 0 };
    }
    this.#activeChoices = [];
    return { accepted: true, runCoinsAwarded: 5 };
  }

  getBuild(): Readonly<RunBuild> {
    return Object.freeze({ ...this.#build });
  }

  getDerivedStats(base: BaseRunStats): Readonly<DerivedRunStats> {
    return Object.freeze(deriveRunStats(base, this.#build, this.#definitions));
  }

  getProgress(): Readonly<{
    level: number;
    xp: number;
    xpRequired: number;
    rerollsRemaining: number;
    activeChoices: readonly UpgradeChoice[];
  }> {
    return Object.freeze({
      level: this.#level,
      xp: this.#xp,
      xpRequired: requiredXp(this.#level),
      rerollsRemaining: this.#rerollsRemaining,
      activeChoices: Object.freeze([...this.#activeChoices]),
    });
  }

  #eligibleDefinitions(): UpgradeDefinition[] {
    return this.#definitions.filter(
      (definition) =>
        (this.#build[definition.id] ?? 0) < definition.maxLevel &&
        (definition.prerequisites ?? []).every(
          (requirement) =>
            (this.#build[requirement.id] ?? 0) >= requirement.level,
        ),
    );
  }

  #toChoice(definition: UpgradeDefinition): UpgradeChoice {
    const currentLevel = this.#build[definition.id] ?? 0;
    const nextLevel = currentLevel + 1;
    return {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      rarity: definition.rarity,
      currentLevel,
      nextLevel,
      effectValue: definition.values[nextLevel - 1] ?? 0,
      description: definition.description ?? definition.name,
      evolution: definition.evolution ?? false,
    };
  }
}
