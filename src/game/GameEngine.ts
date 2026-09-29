import { BALANCE } from "../data/balance";
import { BLOCK_DEFINITIONS } from "../data/blocks";
import { BreakPipeline } from "../combat/BreakPipeline";
import { DamageSystem } from "../combat/DamageSystem";
import { ExplosionSystem } from "../combat/ExplosionSystem";
import { LightningSystem } from "../combat/LightningSystem";
import { DroneSystem, type DroneRenderState } from "../abilities/DroneSystem";
import { BreakTimeSystem } from "../abilities/BreakTimeSystem";
import { ComboSystem } from "../abilities/ComboSystem";
import { MiningSystem } from "../player/MiningSystem";
import { PlayerSystem } from "../player/PlayerSystem";
import { ChunkManager } from "../world/ChunkManager";
import { SeededRng } from "../world/SeededRng";
import { WorldGenerator } from "../world/WorldGenerator";
import type { BiomeId, BlockType } from "../world/worldTypes";
import { RUN_UPGRADES } from "../data/upgrades";
import { UpgradeManager, type LevelProgressResult } from "../upgrades/UpgradeManager";
import type { BaseRunStats } from "../upgrades/UpgradeEffects";
import type { GameCommand, UISnapshot, Vec2, VisualEvent } from "./gameTypes";
import { FixedStepLoop } from "./FixedStepLoop";

export interface GameEngineOptions {
  seed?: number | string;
  runDurationSeconds?: number;
  now?: () => number;
  startingXp?: number;
  startingBreakGauge?: number;
}

export interface PlayerRenderState {
  position: Vec2;
}

export interface BlockRenderState {
  id: string;
  type: BlockType;
  tileX: number;
  tileY: number;
  currentHp: number;
  maxHp: number;
  color: number;
}

export interface EngineRenderState {
  phase: UISnapshot["phase"];
  seed: number | string;
  biome: BiomeId;
  player: PlayerRenderState;
  blocks: readonly BlockRenderState[];
  drones: readonly DroneRenderState[];
  visualEvents: readonly VisualEvent[];
}

const INITIAL_SNAPSHOT: Omit<UISnapshot, "timeRemainingSeconds"> = {
  phase: "MENU",
  depthMeters: 0,
  level: 1,
  xp: 0,
  xpRequired: 14,
  runCoins: 0,
  coreShards: 0,
  combo: 0,
  breakGauge: 0,
  breakTimeRemainingSeconds: 0,
  upgradeChoices: [],
  rerollsRemaining: 1,
};

const BASE_RUN_STATS: BaseRunStats = {
  drillPower: 10,
  miningSpeedMultiplier: 1,
  moveSpeedMultiplier: 1,
  criticalChance: 0.05,
  criticalMultiplier: 2,
  explosionChance: 0,
  explosionRadius: 1.5,
  explosionDamageMultiplier: 1,
  lightningTargets: 0,
  lightningDamageMultiplier: 1,
  droneCount: 0,
  droneAttackSpeedMultiplier: 1,
  droneDamageMultiplier: 1,
};

export class GameEngine {
  readonly #runDurationSeconds: number;
  readonly #startingXp: number;
  readonly #startingBreakGauge: number;
  readonly #loop: FixedStepLoop;
  readonly #listeners = new Set<() => void>();
  #seed: number | string;
  #snapshot: Readonly<UISnapshot>;
  #world: ChunkManager | undefined;
  #player: PlayerSystem | undefined;
  readonly #mining = new MiningSystem();
  #damage: DamageSystem | undefined;
  #upgrades: UpgradeManager | undefined;
  readonly #breakPipeline = new BreakPipeline();
  #explosions: ExplosionSystem | undefined;
  readonly #lightning = new LightningSystem();
  readonly #drones = new DroneSystem();
  readonly #combo = new ComboSystem();
  #breakTime: BreakTimeSystem;
  #input = { moveX: 0, moveY: 0, abilityPressed: false };
  #visualEvents: VisualEvent[] = [];
  #uiPublishAccumulator = 0;
  #destroyed = false;

  constructor(options: GameEngineOptions = {}) {
    this.#runDurationSeconds =
      options.runDurationSeconds ?? BALANCE.runDurationSeconds;
    this.#startingXp = Math.max(0, options.startingXp ?? 0);
    this.#startingBreakGauge = Math.max(
      0,
      Math.min(100, options.startingBreakGauge ?? 0),
    );
    this.#breakTime = new BreakTimeSystem(this.#startingBreakGauge);
    this.#seed = options.seed ?? Math.floor((options.now ?? Date.now)());
    this.#snapshot = Object.freeze({
      ...INITIAL_SNAPSHOT,
      timeRemainingSeconds: this.#runDurationSeconds,
    });
    this.#loop = new FixedStepLoop(
      1 / BALANCE.simulationHz,
      8,
      (dt) => this.#step(dt),
    );
  }

  dispatch(command: GameCommand): void {
    if (this.#destroyed) return;

    switch (command.type) {
      case "START_RUN":
        this.#seed = command.seed ?? this.#seed;
        this.#world = new ChunkManager(
          new WorldGenerator(this.#seed),
          BALANCE.activeChunkRadius,
        );
        this.#world.updateActiveSet({ x: 0, y: 0 });
        const surfaceChunk = this.#world
          .getActiveChunks()
          .find(
            (chunk) => chunk.coordinate.x === 0 && chunk.coordinate.y === 0,
          );
        const routeColumn = surfaceChunk?.routeColumns[0] ?? 10;
        this.#player = new PlayerSystem({
          position: {
            x: routeColumn * BALANCE.tileSize + BALANCE.tileSize / 2,
            y: BALANCE.tileSize / 2,
          },
          moveSpeed: 100,
          radius: 10,
        });
        this.#world.updateActiveSet(this.#player.getState().position);
        this.#damage = new DamageSystem(
          this.#world,
          new SeededRng(this.#seed).fork("damage"),
        );
        this.#explosions = new ExplosionSystem(
          new SeededRng(this.#seed).fork("explosions"),
        );
        this.#upgrades = new UpgradeManager(
          RUN_UPGRADES,
          new SeededRng(this.#seed).fork("upgrades"),
        );
        const startingProgress = this.#upgrades.addXp(this.#startingXp);
        this.#breakPipeline.clear();
        this.#combo.reset();
        this.#breakTime = new BreakTimeSystem(this.#startingBreakGauge);
        this.#mining.resetTarget();
        this.#input = { moveX: 0, moveY: 0, abilityPressed: false };
        this.#visualEvents = [];
        this.#setSnapshot({
          ...INITIAL_SNAPSHOT,
          phase: "RUNNING",
          timeRemainingSeconds: this.#runDurationSeconds,
          level: startingProgress.level,
          xp: startingProgress.xp,
          xpRequired: startingProgress.xpRequired,
          rerollsRemaining: 1,
          breakGauge: this.#startingBreakGauge,
        });
        this.#loop.reset();
        this.#publish();
        break;
      case "PAUSE":
        if (this.#snapshot.phase === "RUNNING") {
          this.#setSnapshot({ ...this.#snapshot, phase: "PAUSED" });
          this.#loop.setPaused(true);
          this.#publish();
        }
        break;
      case "RESUME":
        if (this.#snapshot.phase === "PAUSED") {
          this.#setSnapshot({ ...this.#snapshot, phase: "RUNNING" });
          this.#loop.setPaused(false);
          this.#publish();
        }
        break;
      case "END_RUN":
        this.#setSnapshot({ ...this.#snapshot, phase: "RESULT" });
        this.#publish();
        break;
      case "SET_INPUT":
        this.#input = { ...command.input };
        break;
      case "SELECT_UPGRADE":
        if (
          this.#snapshot.phase === "LEVEL_UP" &&
          this.#upgrades?.select(command.upgradeId).accepted
        ) {
          const progress = this.#upgrades.getProgress();
          this.#setSnapshot({
            ...this.#snapshot,
            phase: "RUNNING",
            upgradeChoices: [],
            rerollsRemaining: progress.rerollsRemaining,
          });
          this.#publish();
        }
        break;
      case "REROLL_UPGRADES":
        if (this.#snapshot.phase === "LEVEL_UP" && this.#upgrades) {
          const result = this.#upgrades.reroll({
            luck: 0,
            elapsedRunSeconds:
              this.#runDurationSeconds - this.#snapshot.timeRemainingSeconds,
          });
          if (result.accepted) {
            this.#setSnapshot({
              ...this.#snapshot,
              upgradeChoices: result.choices,
              rerollsRemaining: result.rerollsRemaining,
            });
            this.#publish();
          }
        }
        break;
      case "SKIP_UPGRADE":
        if (this.#snapshot.phase === "LEVEL_UP" && this.#upgrades) {
          const result = this.#upgrades.skip();
          if (result.accepted) {
            this.#setSnapshot({
              ...this.#snapshot,
              phase: "RUNNING",
              runCoins: this.#snapshot.runCoins + result.runCoinsAwarded,
              upgradeChoices: [],
            });
            this.#publish();
          }
        }
        break;
    }
  }

  advance(realDeltaSeconds: number): void {
    if (this.#destroyed) return;
    this.#loop.advance(realDeltaSeconds);
  }

  getSnapshot = (): Readonly<UISnapshot> => this.#snapshot;

  getRenderState(): Readonly<EngineRenderState> {
    const activeChunks = this.#world?.getActiveChunks() ?? [];
    const blocks = activeChunks.flatMap((chunk) =>
      chunk.blocks.flatMap((block) =>
        block
          ? [
              Object.freeze({
                id: block.id,
                type: block.type,
                tileX: block.tileX,
                tileY: block.tileY,
                currentHp: block.currentHp,
                maxHp: block.maxHp,
                color: BLOCK_DEFINITIONS[block.type].color,
              }),
            ]
          : [],
      ),
    );
    const biome =
      activeChunks.find(
        (chunk) => chunk.coordinate.x === 0 && chunk.coordinate.y === 0,
      )?.biome ?? "STONE_CAVERN";
    return Object.freeze({
      phase: this.#snapshot.phase,
      seed: this.#seed,
      biome,
      player: Object.freeze({
        position: Object.freeze({
          ...(this.#player?.getState().position ?? { x: 0, y: 0 }),
        }),
      }),
      blocks: Object.freeze(blocks),
      drones: Object.freeze([...this.#drones.getRenderState()]),
      visualEvents: Object.freeze([...this.#visualEvents]),
    });
  }

  subscribeSnapshot = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  setDocumentHidden(hidden: boolean): void {
    if (this.#destroyed) return;
    this.#loop.setPaused(hidden || this.#snapshot.phase === "PAUSED");
  }

  destroy(): void {
    this.#destroyed = true;
    this.#listeners.clear();
    this.#loop.setPaused(true);
  }

  #step(dt: number): void {
    if (this.#snapshot.phase !== "RUNNING") return;

    this.#visualEvents = [];
    let levelProgress: LevelProgressResult | undefined;
    this.#combo.step(dt);
    const breakTimeStep = this.#breakTime.step(dt);
    if (breakTimeStep.ended) this.#visualEvents.push({ type: "BREAK_TIME_END" });
    if (this.#world && this.#player && this.#damage) {
      const derivedStats = this.#upgrades?.getDerivedStats(BASE_RUN_STATS) ?? {
        ...BASE_RUN_STATS,
        piercingChance: 0,
        multiBombChance: 0,
        clusterBombs: 0,
        staticHit: false,
        thunderstormThreshold: 0,
        droneCapBonus: 0,
        laserDrone: false,
        nuclearBomb: false,
        thunderGod: false,
        droneArmy: false,
      };
      const breakTimeModifiers = this.#breakTime.getModifiers();
      const stats = {
        ...derivedStats,
        miningSpeedMultiplier:
          derivedStats.miningSpeedMultiplier *
          breakTimeModifiers.miningSpeedMultiplier,
        moveSpeedMultiplier:
          derivedStats.moveSpeedMultiplier * breakTimeModifiers.moveSpeedMultiplier,
        explosionChance:
          derivedStats.explosionChance + breakTimeModifiers.explosionChanceBonus,
      };
      this.#drones.syncBuild(this.#upgrades?.getBuild() ?? {});
      this.#player.setMoveSpeed(100 * stats.moveSpeedMultiplier);
      const playerStep = this.#player.step(dt, this.#input, this.#world);
      const miningRequests = this.#mining.step(
        dt,
        playerStep.miningTarget,
        {
          drillPower: stats.drillPower,
          miningSpeedMultiplier: stats.miningSpeedMultiplier,
          criticalChance: stats.criticalChance,
          criticalMultiplier: stats.criticalMultiplier,
        },
      );

      const activeBlocks = this.#world
        .getActiveChunks()
        .flatMap((chunk) => chunk.blocks)
        .filter((block): block is NonNullable<typeof block> => block !== null);
      const playerPosition = this.#player.getState().position;
      const droneRequests = this.#drones.step(dt, {
        blocks: activeBlocks,
        playerPosition: {
          x: playerPosition.x / BALANCE.tileSize,
          y: playerPosition.y / BALANCE.tileSize,
        },
      });
      const lightningRequests = this.#lightning.processTick({
        blocks: activeBlocks,
      });
      const explosionBreaks =
        this.#explosions?.processTick({
          blocks: activeBlocks,
          applyDamage: (request) => this.#damage?.apply(request),
        }) ?? [];
      explosionBreaks.forEach((request) => this.#breakPipeline.enqueue(request));
      const damageRequests = [
        ...miningRequests,
        ...droneRequests,
        ...lightningRequests,
      ];

      for (const request of damageRequests) {
        const result = this.#damage.apply(request);
        if (result.hit) {
          this.#visualEvents.push({
            type: "BLOCK_HIT",
            position: result.position,
            critical: result.critical,
          });
        }
        if (result.critical) {
          this.#lightning.enqueueFromCritical(
            {
              critical: true,
              position: {
                x: request.target.tileX,
                y: request.target.tileY,
              },
            },
            stats,
            result.chainDepth,
          );
        }
        if (result.destroyedBlock) {
          this.#breakPipeline.enqueue({
            block: result.destroyedBlock,
            chainDepth: result.chainDepth,
          });
        }
      }

      const breakResult = this.#breakPipeline.processTick({
        emit: (event, request) => {
          if (event === "BLOCK_DESTROYED") {
            const comboResult = this.#combo.onBreak();
            comboResult.milestones.forEach((combo) => {
              this.#visualEvents.push({ type: "COMBO_MILESTONE", combo });
            });
            const breakTimeResult = this.#breakTime.onBreak(request.block.type);
            if (breakTimeResult.started) {
              this.#visualEvents.push({ type: "BREAK_TIME_START" });
            }
          } else if (event === "VISUAL_EVENT_EMITTED") {
            this.#visualEvents.push({
              type: "BLOCK_BREAK",
              position: {
                x: request.block.tileX * BALANCE.tileSize + BALANCE.tileSize / 2,
                y: request.block.tileY * BALANCE.tileSize + BALANCE.tileSize / 2,
              },
              color: BLOCK_DEFINITIONS[request.block.type].color,
            });
          } else if (event === "ON_BREAK_ENQUEUED") {
            this.#explosions?.maybeEnqueueOnBreak(
              request.block,
              stats,
              request.chainDepth,
            );
          }
        },
      });
      this.#world.updateActiveSet(playerPosition);
      levelProgress = this.#upgrades?.addXp(breakResult.xpAwarded);
      this.#setSnapshot({
        ...this.#snapshot,
        depthMeters: this.#world.getDepthMeters(playerPosition.y),
        level: levelProgress?.level ?? this.#snapshot.level,
        xp: levelProgress?.xp ?? this.#snapshot.xp + breakResult.xpAwarded,
        xpRequired: levelProgress?.xpRequired ?? this.#snapshot.xpRequired,
        runCoins:
          this.#snapshot.runCoins +
          Math.round(
            breakResult.runCoinsAwarded *
              this.#breakTime.getModifiers().rewardMultiplier,
          ),
        combo: Math.floor(this.#combo.getState().combo),
        breakGauge: this.#breakTime.getState().gauge,
        breakTimeRemainingSeconds: this.#breakTime.getState().remainingSeconds,
      });
    }

    const remainingAfterStep = this.#snapshot.timeRemainingSeconds - dt;
    const timeRemainingSeconds =
      remainingAfterStep <= 1e-9 ? 0 : remainingAfterStep;
    let phase: UISnapshot["phase"] =
      timeRemainingSeconds === 0 ? "RESULT" : "RUNNING";
    if (phase === "RESULT") {
      this.#breakTime.cancel();
      this.#visualEvents = this.#visualEvents.filter(
        (event) => event.type !== "BREAK_TIME_START",
      );
    }
    let upgradeChoices = this.#snapshot.upgradeChoices;
    let rerollsRemaining = this.#snapshot.rerollsRemaining;
    if (phase !== "RESULT" && levelProgress?.leveledUp && this.#upgrades) {
      phase = "LEVEL_UP";
      upgradeChoices = this.#upgrades.createChoices({
        luck: 0,
        elapsedRunSeconds: this.#runDurationSeconds - timeRemainingSeconds,
      });
      rerollsRemaining = this.#upgrades.getProgress().rerollsRemaining;
    }
    this.#setSnapshot({
      ...this.#snapshot,
      phase,
      timeRemainingSeconds,
      upgradeChoices: phase === "RESULT" ? [] : upgradeChoices,
      rerollsRemaining,
      combo: Math.floor(this.#combo.getState().combo),
      breakGauge: this.#breakTime.getState().gauge,
      breakTimeRemainingSeconds: this.#breakTime.getState().remainingSeconds,
    });

    this.#uiPublishAccumulator += dt;
    const publishInterval = 1 / BALANCE.uiPublishHz;
    if (this.#uiPublishAccumulator + Number.EPSILON >= publishInterval) {
      this.#uiPublishAccumulator %= publishInterval;
      this.#publish();
    }
  }

  #setSnapshot(snapshot: UISnapshot): void {
    this.#snapshot = Object.freeze(snapshot);
  }

  #publish(): void {
    this.#listeners.forEach((listener) => listener());
  }
}
