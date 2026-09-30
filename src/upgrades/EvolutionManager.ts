import type { UpgradeDefinition, UpgradeId } from "../data/upgrades";
import type { RunBuild } from "./UpgradeManager";

export class EvolutionManager {
  readonly #evolutions: readonly UpgradeDefinition[];

  constructor(evolutions: readonly UpgradeDefinition[]) {
    this.#evolutions = evolutions;
  }

  getEligible(build: Readonly<RunBuild>): readonly UpgradeId[] {
    return this.#evolutions
      .filter(
        (evolution) =>
          (build[evolution.id] ?? 0) < evolution.maxLevel &&
          (evolution.prerequisites ?? []).every(
            (requirement) =>
              (build[requirement.id] ?? 0) >= requirement.level,
          ),
      )
      .map((evolution) => evolution.id);
  }
}
