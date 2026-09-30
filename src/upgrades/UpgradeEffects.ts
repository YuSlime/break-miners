import type { UpgradeDefinition, UpgradeId } from "../data/upgrades";
import type { RunBuild } from "./UpgradeManager";

export interface BaseRunStats {
  drillPower: number;
  miningSpeedMultiplier: number;
  moveSpeedMultiplier: number;
  criticalChance: number;
  criticalMultiplier: number;
  explosionChance: number;
  explosionRadius: number;
  explosionDamageMultiplier: number;
  lightningTargets: number;
  lightningDamageMultiplier: number;
  droneCount: number;
  droneAttackSpeedMultiplier: number;
  droneDamageMultiplier: number;
}

export interface DerivedRunStats extends BaseRunStats {
  piercingChance: number;
  multiBombChance: number;
  clusterBombs: number;
  staticHit: boolean;
  thunderstormThreshold: number;
  droneCapBonus: number;
  laserDrone: boolean;
  nuclearBomb: boolean;
  thunderGod: boolean;
  droneArmy: boolean;
}

function valueAt(definition: UpgradeDefinition, level: number): number {
  if (level <= 0) return 0;
  return definition.values[Math.min(level, definition.values.length) - 1] ?? 0;
}

export function deriveRunStats(
  base: BaseRunStats,
  build: Readonly<RunBuild>,
  definitions: readonly UpgradeDefinition[],
): DerivedRunStats {
  const byId = new Map<UpgradeId, UpgradeDefinition>(
    definitions.map((definition) => [definition.id, definition]),
  );
  const value = (id: UpgradeId) => {
    const definition = byId.get(id);
    return definition ? valueAt(definition, build[id] ?? 0) : 0;
  };

  return {
    ...base,
    drillPower: base.drillPower * (1 + value("power_drill")),
    miningSpeedMultiplier:
      base.miningSpeedMultiplier * (1 + value("rapid_drill")),
    criticalChance: base.criticalChance + value("critical_edge"),
    criticalMultiplier: base.criticalMultiplier + value("critical_force"),
    explosionChance: base.explosionChance + value("mini_bomb"),
    explosionRadius: base.explosionRadius * (1 + value("bigger_boom")),
    explosionDamageMultiplier:
      base.explosionDamageMultiplier * (1 + value("high_explosive")),
    lightningTargets: Math.max(base.lightningTargets, value("chain_lightning")),
    lightningDamageMultiplier:
      base.lightningDamageMultiplier * (1 + value("overvolt")),
    droneCount: base.droneCount + value("mining_drone") + value("drone_army"),
    droneAttackSpeedMultiplier:
      base.droneAttackSpeedMultiplier * (1 + value("rapid_drone")),
    droneDamageMultiplier:
      base.droneDamageMultiplier * (1 + value("power_drone")),
    piercingChance: value("piercing_drill"),
    multiBombChance: value("multi_bomb"),
    clusterBombs: value("cluster_bomb"),
    staticHit: value("static_hit") > 0,
    thunderstormThreshold: value("thunderstorm"),
    droneCapBonus: value("swarm"),
    laserDrone: value("laser_drone") > 0,
    nuclearBomb: value("nuclear_bomb") > 0,
    thunderGod: value("thunder_god") > 0,
    droneArmy: value("drone_army") > 0,
  };
}
