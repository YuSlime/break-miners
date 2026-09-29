import { BALANCE } from "../data/balance";
import { BLOCK_DEFINITIONS } from "../data/blocks";
import { BreakPipeline } from "../combat/BreakPipeline";
import { DamageSystem } from "../combat/DamageSystem";
import { MiningSystem } from "../player/MiningSystem";
import { PlayerSystem } from "../player/PlayerSystem";
import { ChunkManager } from "../world/ChunkManager";
import { SeededRng } from "../world/SeededRng";
import { WorldGenerator } from "../world/WorldGenerator";
import type { BiomeId, BlockType } from "../world/worldTypes";
import type { GameCommand, UISnapshot, Vec2, VisualEvent } from "./gameTypes";
import { FixedStepLoop } from "./FixedStepLoop";

export interface GameEngineOptions {
  seed?: number | string;
  runDurationSeconds?: number;
  now?: () => number;
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
};

export class GameEngine {
  readonly #runDurationSeconds: number;
  readonly #loop: FixedStepLoop;
  readonly #listeners = new Set<() => void>();
  #seed: number | string;
  #snapshot: Readonly<UISnapshot>;
  #world: ChunkManager | undefined;
  #player: PlayerSystem | undefined;
  readonly #mining = new MiningSystem();
  #damage: DamageSystem | undefined;
  readonly #breakPipeline = new BreakPipeline();
  #input = { moveX: 0, moveY: 0, abilityPressed: false };
  #visualEvents: VisualEvent[] = [];
  #uiPublishAccumulator = 0;
  #destroyed = false;

  constructor(options: GameEngineOptions = {}) {
    this.#runDurationSeconds =
      options.runDurationSeconds ?? BALANCE.runDurationSeconds;
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
        this.#breakPipeline.clear();
        this.#mining.resetTarget();
        this.#input = { moveX: 0, moveY: 0, abilityPressed: false };
        this.#visualEvents = [];
        this.#setSnapshot({
          ...INITIAL_SNAPSHOT,
          phase: "RUNNING",
          timeRemainingSeconds: this.#runDurationSeconds,
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
      case "REROLL_UPGRADES":
      case "SKIP_UPGRADE":
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
    if (this.#world && this.#player && this.#damage) {
      const playerStep = this.#player.step(dt, this.#input, this.#world);
      const damageRequests = this.#mining.step(
        dt,
        playerStep.miningTarget,
        {
          drillPower: 10,
          miningSpeedMultiplier: 1,
          criticalChance: 0.05,
          criticalMultiplier: 2,
        },
      );

      for (const request of damageRequests) {
        const result = this.#damage.apply(request);
        if (result.hit) {
          this.#visualEvents.push({
            type: "BLOCK_HIT",
            position: result.position,
            critical: result.critical,
          });
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
          if (event === "VISUAL_EVENT_EMITTED") {
            this.#visualEvents.push({
              type: "BLOCK_BREAK",
              position: {
                x: request.block.tileX * BALANCE.tileSize + BALANCE.tileSize / 2,
                y: request.block.tileY * BALANCE.tileSize + BALANCE.tileSize / 2,
              },
              color: BLOCK_DEFINITIONS[request.block.type].color,
            });
          }
        },
      });
      const playerPosition = this.#player.getState().position;
      this.#world.updateActiveSet(playerPosition);
      this.#setSnapshot({
        ...this.#snapshot,
        depthMeters: this.#world.getDepthMeters(playerPosition.y),
        xp: this.#snapshot.xp + breakResult.xpAwarded,
        runCoins: this.#snapshot.runCoins + breakResult.runCoinsAwarded,
        combo: this.#snapshot.combo + breakResult.processed,
        breakGauge: Math.min(
          100,
          this.#snapshot.breakGauge + breakResult.breakGaugeAwarded,
        ),
      });
    }

    const timeRemainingSeconds = Math.max(
      0,
      this.#snapshot.timeRemainingSeconds - dt,
    );
    const phase = timeRemainingSeconds === 0 ? "RESULT" : "RUNNING";
    this.#setSnapshot({ ...this.#snapshot, phase, timeRemainingSeconds });

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
