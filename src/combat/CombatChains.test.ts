import type { DerivedRunStats } from "../upgrades/UpgradeEffects";
import { SeededRng } from "../world/SeededRng";
import type { BlockState } from "../world/worldTypes";
import { ExplosionSystem } from "./ExplosionSystem";
import { LightningSystem } from "./LightningSystem";
import type { DamageRequest } from "./DamageSystem";

function block(id: string, tileX: number, tileY: number, type: BlockState["type"] = "STONE"): BlockState {
  return { id, type, tileX, tileY, currentHp: 10, maxHp: 10, destroyed: false };
}

const stats: DerivedRunStats = {
  drillPower: 10, miningSpeedMultiplier: 1, moveSpeedMultiplier: 1,
  criticalChance: 0.05, criticalMultiplier: 2,
  explosionChance: 0, explosionRadius: 2, explosionDamageMultiplier: 1,
  lightningTargets: 3, lightningDamageMultiplier: 1,
  droneCount: 0, droneAttackSpeedMultiplier: 1, droneDamageMultiplier: 1,
  piercingChance: 0, multiBombChance: 0, clusterBombs: 0,
  staticHit: false, thunderstormThreshold: 0, droneCapBonus: 0,
  laserDrone: false, nuclearBomb: false, thunderGod: false, droneArmy: false,
};

describe("ExplosionSystem", () => {
  it("uses configured proc chance and always triggers explosive rocks", () => {
    const system = new ExplosionSystem(new SeededRng(1));
    expect(system.maybeEnqueueOnBreak(block("stone", 0, 0), stats, 0)).toBe(false);
    expect(system.maybeEnqueueOnBreak(block("bomb", 0, 0, "EXPLOSIVE_ROCK"), stats, 0)).toBe(true);
    expect(system.maybeEnqueueOnBreak(block("sure", 0, 0), { ...stats, explosionChance: 1 }, 0)).toBe(true);
  });

  it("applies radius and damage modifiers through queued work", () => {
    const system = new ExplosionSystem(new SeededRng(2));
    system.enqueue({ position: { x: 0, y: 0 }, radiusTiles: 1.5, damage: 14, chainDepth: 1, clusterBombs: 0 });
    const applyDamage = vi.fn((_request: DamageRequest) => undefined);

    system.processTick({ blocks: [block("near", 1, 0), block("far", 4, 0)], applyDamage });

    expect(applyDamage).toHaveBeenCalledTimes(1);
    expect(applyDamage.mock.calls[0]![0]).toMatchObject({ amount: 14, chainDepth: 1 });
  });

  it("queues four child bombs and defers nuclear work until processing", () => {
    const system = new ExplosionSystem(new SeededRng(3));
    system.enqueue({ position: { x: 0, y: 0 }, radiusTiles: 2, damage: 10, chainDepth: 0, clusterBombs: 4 });
    const applyDamage = vi.fn((_request: DamageRequest) => undefined);
    system.processTick({ blocks: [], applyDamage });
    expect(system.pendingCount).toBe(4);

    system.enqueueNuclear({ x: 3, y: 4 }, 0);
    expect(applyDamage).not.toHaveBeenCalled();
    expect(system.pendingCount).toBe(5);
  });
});

describe("LightningSystem", () => {
  it("starts only from critical hits with Static Hit", () => {
    const system = new LightningSystem();
    expect(system.enqueueFromCritical({ critical: false, position: { x: 0, y: 0 } }, { ...stats, staticHit: true }, 0)).toBe(false);
    expect(system.enqueueFromCritical({ critical: true, position: { x: 0, y: 0 } }, stats, 0)).toBe(false);
    expect(system.enqueueFromCritical({ critical: true, position: { x: 0, y: 0 } }, { ...stats, staticHit: true }, 0)).toBe(true);
  });

  it("selects nearest distinct targets with stable tie breaking", () => {
    const system = new LightningSystem();
    system.enqueue({ origin: { x: 0, y: 0 }, damage: 8, targetCount: 3, chainDepth: 1 });

    const requests = system.processTick({
      blocks: [block("b", 1, 0), block("a", -1, 0), block("c", 2, 0), block("d", 4, 0)],
    });

    expect(requests.map((request) => request.target.blockId)).toEqual(["a", "b", "c"]);
    expect(new Set(requests.map((request) => request.target.blockId)).size).toBe(3);
  });

  it("caps Thunder God at 12 links and rejects depth beyond eight", () => {
    const system = new LightningSystem();
    expect(system.enqueue({ origin: { x: 0, y: 0 }, damage: 5, targetCount: 30, chainDepth: 9 })).toBe(false);
    expect(system.enqueue({ origin: { x: 0, y: 0 }, damage: 5, targetCount: 30, chainDepth: 0, thunderGod: true })).toBe(true);
    const blocks = Array.from({ length: 20 }, (_, index) => block(String(index), index + 1, 0));
    expect(system.processTick({ blocks })).toHaveLength(12);
  });
});
