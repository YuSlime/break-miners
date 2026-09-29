# BREAK MINERS Vertical-Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, deterministic, performance-bounded BREAK MINERS vertical slice covering Home, an eight-minute mining run, build-forming upgrades, BREAK TIME, Result, Garage, persistence, and immediate replay.

**Architecture:** React owns screens and throttled UI snapshots, a framework-independent `GameEngine` owns authoritative fixed-step simulation, and PixiJS renders engine state plus budgeted visual events. Gameplay systems communicate through typed commands and iterative event queues so rendering quality and frame rate cannot change outcomes.

**Tech Stack:** TypeScript strict mode, React, Vite, PixiJS, Vitest, React Testing Library, CSS, LocalStorage

**Spec:** `docs/superpowers/specs/2026-09-30-break-miners-vertical-slice-design.md`

## Global Constraints

- Production run duration is exactly 480 seconds; shorter durations are injected only by tests or development configuration.
- Simulation uses a fixed 1/60-second step and clamps long-frame catch-up.
- React never owns or updates per-frame entity state.
- UI snapshots are published at approximately 10 Hz, independently of render FPS.
- Moving into a block is the normal mining input; there is no separate normal-mining button.
- A mining pulse occurs every 0.1 simulation seconds and is frame-rate independent.
- Level-up presents three distinct eligible choices and pauses the run timer.
- BREAK TIME starts at 100 gauge, lasts 8 seconds, cannot gain gauge while active, and resets the gauge to zero on exit.
- Block-break side effects execute in the specification's fixed order.
- Chain processing is iterative, limited to 150 block breaks per simulation tick, proc-chain depth 8, and 10,000 total pending gameplay queue entries.
- Gameplay results cannot depend on particle count, quality level, device pixel ratio, or render frame rate.
- TypeScript strict mode remains enabled; no blanket `any`, `@ts-ignore`, or disabled lint/type rules.
- Production UI supports current Chrome, Edge, and Safari on desktop, phone, and tablet.
- Touch targets are at least 44 CSS pixels.
- Reduced Motion changes presentation only, never gameplay timing or results.
- All user-visible gameplay strings live in centralized UI/data definitions rather than engine logic.
- Third-party game art or audio is not copied; initial visuals are procedural Pixi Graphics, CSS, or original generated assets.

## Review Focus

- Corrupt or structurally valid-but-hostile LocalStorage input must fall back without crashing or applying impossible upgrade levels; Task 10 tests this.
- A tab hidden for minutes must resume at the same run time without a catch-up spiral; Task 2 tests this.
- Simultaneous level-up, BREAK TIME threshold, and timer expiry must resolve deterministically with timer expiry taking precedence after the current fixed step; Tasks 6, 8, and 9 test this.
- A massive cyclic explosion/lightning graph must respect destroyed-block deduplication, depth 8, total queue caps, and 150 breaks per tick; Tasks 4, 7, and 12 test this.
- Orientation/DPR changes and multi-touch cancellation must not reset a run or leave movement stuck; Task 11 tests this.

---

## File Map

The following boundaries are locked for the initial implementation:

```text
src/
  app/
    App.tsx                    screen composition and engine lifetime
    App.test.tsx               shell/navigation tests
    useEngineSnapshot.ts       10 Hz React subscription bridge
  game/
    GameEngine.ts              authoritative facade and command dispatch
    GameEngine.test.ts         cross-system integration tests
    FixedStepLoop.ts           accumulator and visibility pause behavior
    FixedStepLoop.test.ts
    gameTypes.ts               phases, commands, events, snapshots
    EventBus.ts                typed synchronous game events
  data/
    balance.ts                 all numeric tuning and production defaults
    blocks.ts                  block definitions
    upgrades.ts                run-upgrade definitions
    permanentUpgrades.ts       Garage definitions
  world/
    SeededRng.ts               deterministic random generator and seed helpers
    SeededRng.test.ts
    WorldGenerator.ts          deterministic chunk content
    WorldGenerator.test.ts
    ChunkManager.ts            active chunks and destroyed-block deltas
    ChunkManager.test.ts
    worldTypes.ts
  input/
    InputController.ts         merges keyboard and touch input
    KeyboardInput.ts
    VirtualStick.tsx
    InputController.test.ts
  player/
    PlayerSystem.ts            movement and block contact
    PlayerSystem.test.ts
    MiningSystem.ts            0.1-second mining pulses
    MiningSystem.test.ts
  combat/
    DamageSystem.ts            damage, criticals, block HP changes
    DamageSystem.test.ts
    BreakPipeline.ts           ordered rewards and bounded break queue
    BreakPipeline.test.ts
    ExplosionSystem.ts
    LightningSystem.ts
    CombatChains.test.ts
  upgrades/
    UpgradeManager.ts          eligibility, rarity, reroll, selection
    UpgradeManager.test.ts
    EvolutionManager.ts
    EvolutionManager.test.ts
    UpgradeEffects.ts          typed derived-stat application
  abilities/
    DroneSystem.ts
    DroneSystem.test.ts
    ComboSystem.ts
    BreakTimeSystem.ts
    BreakTimeSystem.test.ts
  run/
    RunSystem.ts               timer, Core Gates, completion and result
    RunSystem.test.ts
    resultTypes.ts
  render/
    PixiRenderer.ts            canvas lifecycle and render-state projection
    Camera.ts                  follow, look-ahead, clamped shake
    DisplayPools.ts            reusable visual objects
    ParticleBudget.ts          device/quality visual limits
    ParticleBudget.test.ts
  audio/
    AudioManager.ts            semantic audio adapter and safe failures
    AudioManager.test.ts
  save/
    saveTypes.ts
    SaveSchema.ts              validation and safe normalization
    SaveSchema.test.ts
    Migration.ts               version-to-version transforms
    Migration.test.ts
    SaveManager.ts             primary/backup LocalStorage persistence
    SaveManager.test.ts
  ui/
    HomeScreen.tsx
    HUD.tsx
    UpgradeModal.tsx
    ResultScreen.tsx
    GarageScreen.tsx
    SettingsScreen.tsx
    ErrorScreen.tsx
    ui.test.tsx
  styles/
    tokens.css
    app.css
  test/
    engineFixtures.ts
    storageFixture.ts
  main.tsx
  vite-env.d.ts
```

---

### Task 1: Runnable Project Shell and Typed Contracts

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/game/gameTypes.ts`
- Create: `src/data/balance.ts`
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`

**Interfaces:**
- Consumes: approved design document only.
- Produces: `GamePhase`, `InputSnapshot`, `Vec2`, `UISnapshot`, `GameCommand`, `VisualEvent`, `BALANCE`, and a runnable React shell.

- [ ] **Step 1: Initialize local source control and scaffold dependencies**

Run `git init`, create the Vite React/TypeScript package files in the current directory without deleting `docs/`, `outputs/`, or `work/`, and install React, React DOM, PixiJS, Vite, TypeScript, Vitest, jsdom, Testing Library, and their required type packages. Commit the generated lockfile; do not depend on globally installed packages.

Define package scripts `dev`, `build`, `preview`, `test`, and `typecheck`; `build` must run strict type checking before Vite's production build.

- [ ] **Step 2: Write the failing shell test**

Create `src/app/App.test.tsx` with assertions equivalent to:

```ts
render(<App />);
expect(screen.getByRole("heading", { name: "BREAK MINERS" })).toBeVisible();
expect(screen.getByRole("button", { name: "START EXPEDITION" })).toBeEnabled();
expect(screen.getByRole("button", { name: "GARAGE" })).toBeEnabled();
expect(screen.getByRole("button", { name: "SETTINGS" })).toBeEnabled();
```

- [ ] **Step 3: Run the shell test and verify failure**

Run: `npm test -- --run src/app/App.test.tsx`  
Expected: FAIL because `App` and/or its screen content does not exist.

- [ ] **Step 4: Define shared contracts and production balance constants**

In `src/game/gameTypes.ts`, define exact exported types:

```ts
export type GamePhase = "BOOT" | "MENU" | "RUNNING" | "LEVEL_UP" | "PAUSED" | "RESULT";
export interface Vec2 { x: number; y: number }
export interface InputSnapshot { moveX: number; moveY: number; abilityPressed: boolean }
export interface UISnapshot {
  phase: GamePhase;
  depthMeters: number;
  timeRemainingSeconds: number;
  level: number;
  xp: number;
  xpRequired: number;
  runCoins: number;
  coreShards: number;
  combo: number;
  breakGauge: number;
  breakTimeRemainingSeconds: number;
}
```

Define discriminated `GameCommand` members for `START_RUN`, `SET_INPUT`, `SELECT_UPGRADE`, `REROLL_UPGRADES`, `SKIP_UPGRADE`, `PAUSE`, `RESUME`, and `END_RUN`. Define `VisualEvent` members needed by later tasks without Pixi types.

In `src/data/balance.ts`, export readonly `BALANCE` with `simulationHz: 60`, `uiPublishHz: 10`, `runDurationSeconds: 480`, `miningPulseSeconds: 0.1`, `breakTimeDurationSeconds: 8`, `maxBreaksPerTick: 150`, `maxChainDepth: 8`, `maxPendingGameplayEvents: 10_000`, `comboDecayDelaySeconds: 1.2`, and tile/chunk values `32`, `20`, `12`.

- [ ] **Step 5: Implement the accessible Home shell and styling tokens**

Implement `App(): JSX.Element` with Home heading and the three enabled actions tested above. Add dark navy/black, cyan, gold, orange, and purple CSS variables, safe-area-aware layout primitives, focus-visible styles, and a minimum 44-pixel button target.

- [ ] **Step 6: Verify task output**

Run: `npm test -- --run src/app/App.test.tsx`  
Expected: PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.  
Run: `npm run build`  
Expected: production bundle succeeds.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json index.html tsconfig*.json vite.config.ts vitest.setup.ts src
git commit -m "feat: scaffold break miners application"
```

---

### Task 2: Deterministic Clock, RNG, Engine Facade, and Visibility Pause

**Files:**
- Create: `src/world/SeededRng.ts`
- Create: `src/world/SeededRng.test.ts`
- Create: `src/game/FixedStepLoop.ts`
- Create: `src/game/FixedStepLoop.test.ts`
- Create: `src/game/EventBus.ts`
- Create: `src/game/GameEngine.ts`
- Create: `src/game/GameEngine.test.ts`
- Create: `src/app/useEngineSnapshot.ts`
- Modify: `src/app/App.tsx`
- Create: `src/test/engineFixtures.ts`

**Interfaces:**
- Consumes: Task 1 `GamePhase`, `GameCommand`, `UISnapshot`, `BALANCE`.
- Produces: `SeededRng`, `FixedStepLoop`, `GameEngine`, `GameEngineOptions`, `EngineRenderState`, `useEngineSnapshot(engine)`.

- [ ] **Step 1: Write failing deterministic RNG tests**

Assert that two `new SeededRng(12345)` instances return the same first 100 `next()` values, that every value is `>= 0 && < 1`, and that `fork("chunk:2:9")` is reproducible without advancing the parent sequence.

- [ ] **Step 2: Run RNG tests and verify failure**

Run: `npm test -- --run src/world/SeededRng.test.ts`  
Expected: FAIL because `SeededRng` does not exist.

- [ ] **Step 3: Implement `SeededRng`**

Export `constructor(seed: number | string)`, `next(): number`, `int(minInclusive: number, maxInclusive: number): number`, `chance(probability: number): boolean`, `pick<T>(items: readonly T[]): T`, and `fork(scope: string): SeededRng`. Hash string seeds deterministically and reject empty collections in `pick`.

- [ ] **Step 4: Write failing fixed-step and hidden-tab tests**

Using a fake `step(dt)` callback, assert:

```ts
loop.advance(1 / 30);
expect(step).toHaveBeenCalledTimes(2);
expect(step).toHaveBeenNthCalledWith(1, 1 / 60);

loop.setPaused(true);
loop.advance(300);
loop.setPaused(false);
loop.advance(1 / 60);
expect(step).toHaveBeenCalledTimes(3); // no five-minute catch-up
```

Also assert that a one-second incoming frame is clamped and never executes more than the configured `maxCatchUpSteps`.

- [ ] **Step 5: Implement `FixedStepLoop` and `GameEngine` facade**

Export:

```ts
interface GameEngineOptions {
  seed?: number | string;
  runDurationSeconds?: number;
  now?: () => number;
}

class FixedStepLoop {
  constructor(stepSeconds: number, maxCatchUpSteps: number, onStep: (dt: number) => void);
  advance(realDeltaSeconds: number): number;
  setPaused(paused: boolean): void;
  reset(): void;
}

class GameEngine {
  constructor(options?: GameEngineOptions);
  dispatch(command: GameCommand): void;
  advance(realDeltaSeconds: number): void;
  getSnapshot(): Readonly<UISnapshot>;
  getRenderState(): Readonly<EngineRenderState>;
  subscribeSnapshot(listener: () => void): () => void;
  setDocumentHidden(hidden: boolean): void;
  destroy(): void;
}
```

Start in `MENU`, enter `RUNNING` on `START_RUN`, decrement time only in `RUNNING`, publish snapshots at 10 Hz, and pause on document visibility changes without accumulating hidden elapsed time.

- [ ] **Step 6: Integrate engine lifetime with React**

Create `useEngineSnapshot(engine: GameEngine): UISnapshot` with `useSyncExternalStore`. `App` owns one engine instance, attaches `visibilitychange`, destroys it on unmount, and dispatches `START_RUN` from the Home button. Show a temporary semantic Run shell containing timer and Pause button; Pixi rendering comes later.

- [ ] **Step 7: Verify task output**

Run: `npm test -- --run src/world/SeededRng.test.ts src/game/FixedStepLoop.test.ts src/game/GameEngine.test.ts src/app/App.test.tsx`  
Expected: PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.

- [ ] **Step 8: Commit**

```bash
git add src/world src/game src/app src/test
git commit -m "feat: add deterministic game engine clock"
```

---

### Task 3: Data-Driven Blocks, Chunks, Depth, and Biomes

**Files:**
- Create: `src/world/worldTypes.ts`
- Create: `src/data/blocks.ts`
- Create: `src/world/WorldGenerator.ts`
- Create: `src/world/WorldGenerator.test.ts`
- Create: `src/world/ChunkManager.ts`
- Create: `src/world/ChunkManager.test.ts`
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/gameTypes.ts`
- Modify: `src/data/balance.ts`

**Interfaces:**
- Consumes: Task 2 `SeededRng`, `GameEngine`.
- Produces: `BlockType`, `BlockDefinition`, `BlockState`, `ChunkCoordinate`, `ChunkData`, `BiomeId`, `WorldGenerator.generateChunk(coord)`, `ChunkManager` lookup/destroy/active-range API.

- [ ] **Step 1: Write failing world-generation tests**

Assert that the same seed and `{ x: 0, y: 7 }` produce deeply equal chunks, a different seed changes at least one non-route tile, each chunk is exactly `20 * 12` tiles, and every generated chunk exposes at least one mineable continuation connecting its top and bottom edges.

Assert biome boundaries: depth 199 is `STONE_CAVERN`, 200 is `CRYSTAL_MINE`, 449 is `CRYSTAL_MINE`, and 450 is `MAGMA_CORE`.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/world/WorldGenerator.test.ts src/world/ChunkManager.test.ts`  
Expected: FAIL because world modules do not exist.

- [ ] **Step 3: Define block and world data**

Export data for `STONE`, `COPPER`, `IRON`, `CRYSTAL`, `GOLD`, `GEODE`, `EXPLOSIVE_ROCK`, and `CORE_GATE`. Store base HP, XP, reward multiplier, rarity flags, color, and special behavior ID. Implement the exact depth scale `1 + Math.pow(depth / 150, 1.2)` and keep biome modifiers in `balance.ts`.

- [ ] **Step 4: Implement deterministic generation and active chunks**

Export:

```ts
class WorldGenerator {
  constructor(seed: number | string);
  generateChunk(coord: ChunkCoordinate): ChunkData;
  getBiome(depthMeters: number): BiomeId;
}

class ChunkManager {
  constructor(generator: WorldGenerator, activeRadiusChunks: number);
  updateActiveSet(playerWorldPosition: Vec2): void;
  getBlockAt(tileX: number, tileY: number): BlockState | undefined;
  damageBlock(tileX: number, tileY: number, damage: number): BlockDamageResult;
  markDestroyed(tileX: number, tileY: number): boolean;
  getActiveChunks(): readonly ChunkData[];
  getDepthMeters(worldY: number): number;
}
```

Place Core Gates at each 100-meter boundary through a deterministic gate row, without blocking all reachable tiles with indestructible geometry.

- [ ] **Step 5: Connect world state to engine snapshots and render state**

Update engine render state to expose active block snapshots and biome without leaking mutable `ChunkData`. Update UI depth from player Y through `ChunkManager.getDepthMeters`.

- [ ] **Step 6: Verify task output**

Run: `npm test -- --run src/world`  
Expected: PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/world src/data src/game
git commit -m "feat: generate deterministic vertical mine"
```

---

### Task 4: Input, Player Movement, Contact Mining, Damage, and Break Pipeline

**Files:**
- Create: `src/input/InputController.ts`
- Create: `src/input/KeyboardInput.ts`
- Create: `src/input/InputController.test.ts`
- Create: `src/player/PlayerSystem.ts`
- Create: `src/player/PlayerSystem.test.ts`
- Create: `src/player/MiningSystem.ts`
- Create: `src/player/MiningSystem.test.ts`
- Create: `src/combat/DamageSystem.ts`
- Create: `src/combat/DamageSystem.test.ts`
- Create: `src/combat/BreakPipeline.ts`
- Create: `src/combat/BreakPipeline.test.ts`
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/EventBus.ts`

**Interfaces:**
- Consumes: Task 3 `ChunkManager`, `BlockState`; Task 1 `InputSnapshot`.
- Produces: normalized input controller, `PlayerSystem`, `MiningSystem`, deterministic `DamageSystem`, and bounded ordered `BreakPipeline`.

- [ ] **Step 1: Write failing normalized-input tests**

Assert that W+D produces a unit-length diagonal vector, opposite keys cancel to zero, blur/reset clears held input, and `abilityPressed` is an edge (true once per press), not a continuously repeated level.

- [ ] **Step 2: Write failing movement/mining tests**

With a fixture world, assert free-space movement starts immediately, block contact clamps the player before overlap, holding direction produces exactly ten mining pulses over one simulation second, and the player resumes movement after the contacted block breaks.

- [ ] **Step 3: Write failing break-order and queue-limit tests**

Subscribe to gameplay events and assert the exact order:

```ts
expect(events).toEqual([
  "BLOCK_DESTROYED",
  "XP_AWARDED",
  "RUN_COINS_AWARDED",
  "COMBO_UPDATED",
  "BREAK_GAUGE_UPDATED",
  "ON_BREAK_ENQUEUED",
  "LOOT_ROLLED",
  "VISUAL_EVENT_EMITTED",
]);
```

Enqueue 151 valid blocks and assert one tick processes 150, leaves one queued, and awards each destroyed block exactly once. Enqueue duplicates and assert no duplicate XP or currency.

- [ ] **Step 4: Run focused tests and verify failure**

Run: `npm test -- --run src/input src/player src/combat/BreakPipeline.test.ts src/combat/DamageSystem.test.ts`  
Expected: FAIL because the systems do not exist.

- [ ] **Step 5: Implement input, movement, and mining interfaces**

Export:

```ts
class InputController {
  setKeyboardAction(action: "UP" | "DOWN" | "LEFT" | "RIGHT" | "ABILITY", pressed: boolean): void;
  setTouchVector(x: number, y: number): void;
  releaseTouch(): void;
  reset(): void;
  snapshot(): InputSnapshot;
}

class PlayerSystem {
  step(dt: number, input: InputSnapshot, world: ChunkManager): PlayerStepResult;
  getState(): Readonly<PlayerState>;
}

class MiningSystem {
  step(dt: number, target: BlockTarget | null, stats: MiningStats): readonly DamageRequest[];
  resetTarget(): void;
}
```

Mining pulse interval is exactly `BALANCE.miningPulseSeconds`. Damage calculation consumes an injected `SeededRng` so critical outcomes are reproducible.

- [ ] **Step 6: Implement damage and ordered break queues**

Export `DamageSystem.apply(request: DamageRequest): DamageResult` and `BreakPipeline.enqueue(event: BreakRequest): void`, `processTick(context: BreakContext): BreakTickResult`, and `clear(): void`. Store queue entries with `chainDepth`; reject entries deeper than 8 and cap total pending gameplay entries at `BALANCE.maxPendingGameplayEvents` in addition to the 150-per-tick processing cap.

- [ ] **Step 7: Connect systems to `GameEngine`**

On each fixed step, read the latest normalized input, step player collision/mining, apply damage, process breaks, update immutable render state, and publish UI values. `LEVEL_UP`, `PAUSED`, and `RESULT` do not accept movement/mining steps.

- [ ] **Step 8: Verify task output**

Run: `npm test -- --run src/input src/player src/combat src/game/GameEngine.test.ts`  
Expected: PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.

- [ ] **Step 9: Commit**

```bash
git add src/input src/player src/combat src/game src/data
git commit -m "feat: add movement-driven mining pipeline"
```

---

### Task 5: Pixi Rendering, Camera, Visual Pools, and HUD

**Files:**
- Create: `src/render/PixiRenderer.ts`
- Create: `src/render/Camera.ts`
- Create: `src/render/DisplayPools.ts`
- Create: `src/render/ParticleBudget.ts`
- Create: `src/render/ParticleBudget.test.ts`
- Create: `src/ui/HUD.tsx`
- Create: `src/ui/ui.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/game/gameTypes.ts`

**Interfaces:**
- Consumes: Task 2 `EngineRenderState`, `VisualEvent`; Task 4 player/block state; Task 1 `UISnapshot`.
- Produces: `PixiRenderer.mount(container)`, render projection, clamped camera effects, visual pools, visual budgets, and accessible HUD.

- [ ] **Step 1: Write failing camera and particle-budget tests**

Assert camera follow includes velocity look-ahead, three simultaneous shake requests never exceed configured maximum amplitude, Reduced Motion returns zero shake, mobile LOW budget caps particles at 300, and desktop HIGH budget caps at 2000.

- [ ] **Step 2: Write failing HUD tests**

Render a known `UISnapshot` and assert visible accessible text for `125m`, `07:42`, `LEVEL 4`, XP progress, `320` Run Coins, `2` Core Shards, and BREAK Gauge value `68`. Assert no normal block HP bar appears in the React DOM.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- --run src/render src/ui/ui.test.tsx`  
Expected: FAIL because render and HUD modules do not exist.

- [ ] **Step 4: Implement renderer lifecycle and procedural visuals**

Export:

```ts
interface PixiRendererOptions {
  container: HTMLElement;
  resolutionCap: number;
  reducedMotion: boolean;
}

class PixiRenderer {
  static create(options: PixiRendererOptions): Promise<PixiRenderer>;
  resize(widthCssPx: number, heightCssPx: number, devicePixelRatio: number): void;
  render(state: Readonly<EngineRenderState>, alpha: number): void;
  consumeVisualEvents(events: readonly VisualEvent[]): void;
  setQuality(settings: RenderQualitySettings): void;
  destroy(): void;
}
```

Draw original procedural block, player, drone, hit-flash, explosion, and lightning shapes. Reuse display objects through typed pools. Never store authoritative HP or rewards in Pixi display objects.

- [ ] **Step 5: Implement camera and HUD**

Camera follows player, adds speed-proportional look-ahead, clamps accumulated shake, and disables shake/zoom impulse in Reduced Motion. HUD uses semantic elements and CSS overlays, stays pointer-transparent except interactive controls, and uses the required edge placement.

- [ ] **Step 6: Integrate canvas/error lifecycle**

`App` mounts Pixi into one container, shows an accessible loading state during async initialization, shows `ErrorScreen` with Retry on failure, forwards resize/DPR changes, consumes render state every animation frame, and keeps React snapshot updates throttled by the engine.

- [ ] **Step 7: Verify task output**

Run: `npm test -- --run src/render src/ui src/app/App.test.tsx`  
Expected: PASS.  
Run: `npm run typecheck && npm run build`  
Expected: both commands succeed.

- [ ] **Step 8: Commit**

```bash
git add src/render src/ui src/app src/styles src/game
git commit -m "feat: render mine and responsive run hud"
```

---

### Task 6: XP, Level-Up, Upgrade Choices, Reroll, Skip, and Evolutions

**Files:**
- Create: `src/data/upgrades.ts`
- Create: `src/upgrades/UpgradeManager.ts`
- Create: `src/upgrades/UpgradeManager.test.ts`
- Create: `src/upgrades/EvolutionManager.ts`
- Create: `src/upgrades/EvolutionManager.test.ts`
- Create: `src/upgrades/UpgradeEffects.ts`
- Create: `src/ui/UpgradeModal.tsx`
- Modify: `src/ui/ui.test.tsx`
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/gameTypes.ts`

**Interfaces:**
- Consumes: Task 2 RNG/engine; Task 4 XP events; Task 5 React overlay.
- Produces: typed upgrade definitions, `UpgradeManager`, `EvolutionManager`, derived run stats, and three-card Level Up UI.

- [ ] **Step 1: Write failing XP and selection tests**

Assert `requiredXp(1)` is rounded from `10 + 1^1.45 * 4`, XP crossing the threshold emits one level-up and carries excess XP, choice count is exactly three when at least three eligible upgrades exist, choices contain unique IDs, max-level upgrades are absent, and identical seed/state produces identical choices.

Add a statistical invariant test over a fixed seed corpus showing increased Luck never decreases the aggregate Rare-or-better weight used by the selector; do not assert flaky random outcome percentages.

- [ ] **Step 2: Write failing reroll/skip/evolution tests**

Assert one reroll is available per run, reroll consumes it and returns a new valid set, a second reroll is rejected, Skip adds the configured small Run Coin amount and resumes play, and each evolution becomes eligible only at the exact required prerequisite levels.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --run src/upgrades`  
Expected: FAIL because upgrade modules do not exist.

- [ ] **Step 4: Define data-driven upgrades**

Define all first-slice Drill, Bomb, Lightning, and Drone upgrades from the approved source spec, including ID, display name, category, rarity, max level, values, description template, and optional prerequisites. Define Nuclear Bomb, Thunder God, and Drone Army as evolution definitions. Keep calculation helpers pure and exhaustively typed.

- [ ] **Step 5: Implement selection and derived stats**

Export:

```ts
class UpgradeManager {
  constructor(definitions: readonly UpgradeDefinition[], rng: SeededRng);
  addXp(amount: number): LevelProgressResult;
  createChoices(context: UpgradeChoiceContext): readonly [UpgradeChoice, UpgradeChoice, UpgradeChoice];
  reroll(context: UpgradeChoiceContext): UpgradeChoiceResult;
  select(id: UpgradeId): UpgradeSelectionResult;
  skip(): UpgradeSkipResult;
  getBuild(): Readonly<RunBuild>;
  getDerivedStats(base: BaseRunStats): Readonly<DerivedRunStats>;
}
```

Use explicit eligibility and normalized rarity weights. Apply the first-minute Bomb/Lightning bias to eligible weight only; never fabricate an ineligible choice.

- [ ] **Step 6: Implement Level Up phase and modal**

After a fixed simulation step awards enough XP, transition to `LEVEL_UP` unless the run has ended. Timer and combat stop. Render three cards with icon placeholder, name, rarity, current level, effect delta, and `Lv n -> n+1`, plus enabled Reroll and Skip actions. Selection applies the upgrade atomically and returns to `RUNNING`.

- [ ] **Step 7: Verify simultaneous state priority**

Add an engine integration test where XP threshold and timer zero occur in the same fixed step. Assert `RESULT` wins, no modal is opened, and no post-run upgrade choice mutates the build.

- [ ] **Step 8: Verify task output**

Run: `npm test -- --run src/upgrades src/game/GameEngine.test.ts src/ui/ui.test.tsx`  
Expected: PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.

- [ ] **Step 9: Commit**

```bash
git add src/data/upgrades.ts src/upgrades src/ui src/game
git commit -m "feat: add level-up build progression"
```

---

### Task 7: Bomb, Lightning, Drone, and Bounded Chain Reactions

**Files:**
- Create: `src/combat/ExplosionSystem.ts`
- Create: `src/combat/LightningSystem.ts`
- Create: `src/combat/CombatChains.test.ts`
- Create: `src/abilities/DroneSystem.ts`
- Create: `src/abilities/DroneSystem.test.ts`
- Modify: `src/combat/BreakPipeline.ts`
- Modify: `src/upgrades/UpgradeEffects.ts`
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/gameTypes.ts`

**Interfaces:**
- Consumes: Task 4 damage/break queues; Task 6 `RunBuild` and derived stats.
- Produces: explosion area requests, nearest-target lightning chains, autonomous drone attacks, and evolution behavior.

- [ ] **Step 1: Write failing explosion tests**

Assert Mini Bomb uses the configured proc chance from injected RNG, Bigger Boom changes radius, High Explosive changes damage, Cluster Bomb enqueues four child explosions with incremented chain depth, Explosive Rock always enqueues its block effect, and Nuclear Bomb schedules work through queues rather than synchronously destroying all targets.

- [ ] **Step 2: Write failing lightning tests**

Assert Static Hit reacts only to critical damage, Chain Lightning selects up to three valid distinct targets by distance, a target is not hit twice in one chain, Overvolt changes damage, Thunder God caps at 12 links, and all entries beyond chain depth 8 are rejected.

- [ ] **Step 3: Write failing drone tests**

Assert one Mining Drone acquires an in-range live block, respects attack cooldown, Rapid Drone changes cooldown, Power Drone changes damage, Laser Drone changes attack presentation without bypassing the damage queue, and Drone Army adds five drones only after evolution activation.

- [ ] **Step 4: Run focused tests and verify failure**

Run: `npm test -- --run src/combat/CombatChains.test.ts src/abilities/DroneSystem.test.ts`  
Expected: FAIL because ability systems do not exist.

- [ ] **Step 5: Implement chain systems**

Export:

```ts
class ExplosionSystem {
  enqueue(request: ExplosionRequest): void;
  processTick(context: CombatContext): readonly BreakRequest[];
}

class LightningSystem {
  enqueue(request: LightningRequest): void;
  processTick(context: CombatContext): readonly DamageRequest[];
}

class DroneSystem {
  syncBuild(build: Readonly<RunBuild>): void;
  step(dt: number, context: DroneContext): readonly DamageRequest[];
  getRenderState(): readonly DroneRenderState[];
}
```

Use stable coordinate/ID tie-breaking so equal-distance targets are deterministic. Every secondary request carries `chainDepth`, source ID, and proc scalar.

- [ ] **Step 6: Connect on-break and on-critical effects**

Route break and critical events to the correct systems through typed engine events. Process queue stages in a fixed order each simulation step and emit budgeted visual events separately. Do not call one combat system recursively from another.

- [ ] **Step 7: Add cyclic-chain regression test**

Build a deterministic fixture where explosive blocks and lightning could repeatedly target the same region. Assert the run terminates processing, no block rewards twice, maximum observed depth is 8, pending queues stay under the configured total cap, and each tick processes at most 150 breaks.

- [ ] **Step 8: Verify task output**

Run: `npm test -- --run src/combat src/abilities src/game/GameEngine.test.ts`  
Expected: PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.

- [ ] **Step 9: Commit**

```bash
git add src/combat src/abilities src/upgrades src/game
git commit -m "feat: add bomb lightning and drone builds"
```

---

### Task 8: Combo, BREAK Gauge, and BREAK TIME

**Files:**
- Create: `src/abilities/ComboSystem.ts`
- Create: `src/abilities/BreakTimeSystem.ts`
- Create: `src/abilities/BreakTimeSystem.test.ts`
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/gameTypes.ts`
- Modify: `src/ui/HUD.tsx`
- Modify: `src/render/Camera.ts`
- Modify: `src/render/PixiRenderer.ts`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: Task 4 block-break events; Task 5 HUD/render; Task 7 proc systems.
- Produces: combo milestones, gauge accumulation, eight-second BREAK TIME modifiers, and presentation events.

- [ ] **Step 1: Write failing combo tests**

Assert consecutive breaks increment combo, no-break time below 1.2 seconds preserves it, crossing 1.2 seconds begins configured decay, and milestones emit once when crossing 10, 25, 50, 100, 250, and 500.

- [ ] **Step 2: Write failing BREAK TIME tests**

Assert normal/rare/gold/geode blocks add 1/2/3/5 gauge, reaching 100 starts exactly eight seconds, active modifiers equal mining `+50%`, movement `+20%`, explosion-proc contribution `+25%`, and reward `+30%`, active breaks add zero gauge, and expiry sets gauge to zero.

Add a deterministic simultaneous-threshold test: if a block reaches gauge 100 on the same fixed step the run timer reaches zero, `RESULT` wins and BREAK TIME does not start.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --run src/abilities/BreakTimeSystem.test.ts`  
Expected: FAIL because systems do not exist.

- [ ] **Step 4: Implement combo and BREAK TIME systems**

Export `ComboSystem.onBreak(count, timeSeconds)`, `step(dt)`, and `getState()`. Export `BreakTimeSystem.onBreak(blockClass)`, `step(dt)`, `getModifiers()`, and `getState()`. Apply modifiers by composing derived stats; do not mutate base upgrade data.

- [ ] **Step 5: Implement presentation states**

HUD animates gauge and remaining BREAK TIME text. Renderer consumes semantic start/end and combo milestone events. Normal motion may use a maximum 80 ms Nuclear hit stop and brief BREAK TIME impulse; Reduced Motion disables hit stop, zoom, flash, and shake while retaining stable palette/text feedback.

- [ ] **Step 6: Verify task output**

Run: `npm test -- --run src/abilities src/game/GameEngine.test.ts src/ui/ui.test.tsx`  
Expected: PASS.  
Run: `npm run typecheck && npm run build`  
Expected: both commands succeed.

- [ ] **Step 7: Commit**

```bash
git add src/abilities src/game src/ui src/render src/styles
git commit -m "feat: add combo and break time"
```

---

### Task 9: Core Gates, Run Completion, Result, Records, and Replay

**Files:**
- Create: `src/run/resultTypes.ts`
- Create: `src/run/RunSystem.ts`
- Create: `src/run/RunSystem.test.ts`
- Create: `src/ui/ResultScreen.tsx`
- Modify: `src/ui/ui.test.tsx`
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/gameTypes.ts`
- Modify: `src/combat/BreakPipeline.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: Task 3 Core Gate data; Tasks 4/7 queues; Task 8 time modifiers and HUD.
- Produces: immutable `RunResult`, records delta, deterministic timer end, Core Gate rewards, and Play Again.

- [ ] **Step 1: Write failing timer/result tests**

Using `runDurationSeconds: 1`, assert time reaches zero after exactly 60 fixed steps, phase becomes `RESULT`, movement/combat stop, unprocessed break/combat/loot queue entries are discarded, and already processed rewards remain. Assert result fields include depth, blocks broken, best combo, Run Coins, awarded Credits, Core Shards, Geodes, build, and record changes.

- [ ] **Step 2: Write failing Core Gate tests**

Assert a gate exists at every 100-meter boundary, has a boss-bar render state, grants configured rewards and one Core Shard exactly once, and queues an upgrade choice only if the run has not ended.

- [ ] **Step 3: Write failing first-run and replay tests**

Assert the first completed run's awarded Credits are at least the cheapest permanent-upgrade cost, `PLAY AGAIN` creates a different default seed, restores 480 seconds, clears run-local queues/build/coins, and retains persistent progression input.

- [ ] **Step 4: Run tests and verify failure**

Run: `npm test -- --run src/run`  
Expected: FAIL because run modules do not exist.

- [ ] **Step 5: Implement `RunSystem` and immutable result snapshot**

Export:

```ts
class RunSystem {
  constructor(options: RunSystemOptions);
  step(dt: number): RunStepResult;
  recordBlockBreak(event: BlockBreakSummary): void;
  recordCoreDestroyed(event: CoreDestroyedSummary): void;
  finish(reason: "TIMER" | "MANUAL"): Readonly<RunResult>;
}
```

Convert Run Coins to persistent Credits through a pure balance function. Freeze or defensively copy the result. Timer expiry takes precedence over starting Level Up or BREAK TIME after the same step.

- [ ] **Step 6: Implement Result screen and Play Again**

Display all result fields, `NEW RECORD` old-to-new values, `PLAY AGAIN`, `GARAGE`, and `HOME`. Count-up animation must respect Reduced Motion. Play Again dispatches a fresh start with current permanent bonuses without requiring Home navigation.

- [ ] **Step 7: Verify task output**

Run: `npm test -- --run src/run src/game/GameEngine.test.ts src/ui/ui.test.tsx`  
Expected: PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.

- [ ] **Step 8: Commit**

```bash
git add src/run src/ui src/game src/combat src/app
git commit -m "feat: add timed runs results and replay"
```

---

### Task 10: Versioned Save, Recovery, Garage, and Permanent Upgrades

**Files:**
- Create: `src/data/permanentUpgrades.ts`
- Create: `src/save/saveTypes.ts`
- Create: `src/save/SaveSchema.ts`
- Create: `src/save/SaveSchema.test.ts`
- Create: `src/save/Migration.ts`
- Create: `src/save/Migration.test.ts`
- Create: `src/save/SaveManager.ts`
- Create: `src/save/SaveManager.test.ts`
- Create: `src/test/storageFixture.ts`
- Create: `src/ui/GarageScreen.tsx`
- Modify: `src/ui/ui.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/game/GameEngine.ts`

**Interfaces:**
- Consumes: Task 9 awarded Credits/records; Task 6 base/derived run stats.
- Produces: `SaveDataV1`, strict validation/normalization, backup persistence, Garage purchases, and permanent bonuses injected into new runs.

- [ ] **Step 1: Write failing schema/migration tests**

Assert missing/invalid data returns a safe default, unknown fields are ignored, `NaN`, infinities, negatives, fractions where integers are required, impossible upgrade levels, duplicate drop IDs, and oversized arrays are normalized or rejected according to explicit schema rules. Assert migration from a legacy version fixture produces current `version: 1` without losing Credits, settings, or records.

- [ ] **Step 2: Write failing primary/backup storage tests**

Assert primary valid data loads, corrupt primary falls back to valid backup, both corrupt return default, a write first copies the previous valid primary to backup, quota/security exceptions return a non-blocking error result, and session state remains available in memory.

- [ ] **Step 3: Write failing Garage tests**

Assert purchases require sufficient Credits, subtract cost once, reject upgrades at cap, use `BaseCost * 1.75^level` with the plan's chosen integer rounding helper, persist immediately, and affect the next run's initial Drill Power, Move Speed, Crit, Luck, Magnet, Starting XP, or Core Bonus as applicable.

- [ ] **Step 4: Run tests and verify failure**

Run: `npm test -- --run src/save src/ui/ui.test.tsx`  
Expected: FAIL because save/Garage modules do not exist.

- [ ] **Step 5: Implement save schema and manager**

Export current `SAVE_VERSION = 1`, `createDefaultSave()`, `parseSaveData(value: unknown): SaveParseResult`, `migrateSave(value: unknown): SaveParseResult`, and:

```ts
class SaveManager {
  constructor(storage: StorageLike, primaryKey?: string, backupKey?: string);
  load(): SaveLoadResult;
  save(data: SaveData): SaveWriteResult;
}
```

Use keys `break_miners_save` and `break_miners_save_backup`. No save or audio exception may propagate into the game loop.

- [ ] **Step 6: Implement permanent definitions and Garage UI**

Define Drill Power `+8%` up to 20, Move Speed `+2%` up to 15, Crit Chance `+1 percentage point` up to 10, Luck `+4%` up to 15, plus explicitly configured values/caps for Crit Damage, Magnet, Starting XP, and Core Bonus. Garage shows current level, next effect, price, affordability, and cap state.

- [ ] **Step 7: Integrate save lifecycle**

Load before showing interactive Home, save after Result award, Garage purchase, settings change, periodic safe points, and `pagehide`. Surface storage failure as a dismissible warning. Add an integration test that completes a short run, purchases an upgrade, rebuilds the app with the same storage fixture, and observes retained Credits/upgrade/settings.

- [ ] **Step 8: Verify task output**

Run: `npm test -- --run src/save src/ui src/game/GameEngine.test.ts`  
Expected: PASS.  
Run: `npm run typecheck && npm run build`  
Expected: both commands succeed.

- [ ] **Step 9: Commit**

```bash
git add src/data/permanentUpgrades.ts src/save src/test src/ui src/app src/game
git commit -m "feat: persist garage progression"
```

---

### Task 11: Mobile Controls, Settings, Accessibility, Orientation, and Audio Adapter

**Files:**
- Create: `src/input/VirtualStick.tsx`
- Modify: `src/input/InputController.test.ts`
- Create: `src/ui/SettingsScreen.tsx`
- Create: `src/ui/ErrorScreen.tsx`
- Modify: `src/ui/ui.test.tsx`
- Create: `src/audio/AudioManager.ts`
- Create: `src/audio/AudioManager.test.ts`
- Modify: `src/render/PixiRenderer.ts`
- Modify: `src/render/ParticleBudget.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/save/saveTypes.ts`

**Interfaces:**
- Consumes: Task 4 input controller; Task 5 renderer; Task 10 settings persistence.
- Produces: pointer-based virtual stick, orientation-safe resizing, full settings controls, reduced-motion behavior, and fault-tolerant semantic audio.

- [ ] **Step 1: Write failing virtual-stick and cancellation tests**

Using pointer events, assert drag normalizes to `[-1, 1]`, diagonal magnitude is capped at 1, `pointerup`, `pointercancel`, lost capture, blur, and component unmount all return input to zero. Assert a second pointer does not steal the active stick and orientation change does not reset engine phase or run time.

- [ ] **Step 2: Write failing Settings/accessibility tests**

Assert controls exist for Master Volume, Music, SFX, Particles, Camera Shake, Damage Numbers, Screen Flash, Vibration, FPS Limit, and Reduced Motion. Assert defaults consult `prefers-reduced-motion` only when no saved override exists, every label is associated with its control, and every interactive touch target has the 44-pixel style token/class.

- [ ] **Step 3: Write failing audio-failure tests**

Assert semantic `MINE`, `BLOCK_BREAK`, `EXPLOSION`, `LIGHTNING`, `RARE_DROP`, `BREAK_TIME_START`, and `CORE_GATE` events respect channel volumes, combo pitch is clamped, and rejected playback/decode promises are caught without throwing or changing engine state.

- [ ] **Step 4: Run tests and verify failure**

Run: `npm test -- --run src/input src/ui src/audio`  
Expected: FAIL because mobile/settings/audio pieces are incomplete.

- [ ] **Step 5: Implement mobile input and responsive behavior**

Implement `VirtualStick` with Pointer Events and pointer capture. Use safe-area insets and responsive CSS for portrait/landscape. Do not render an inactive Ability button because the first slice defines no active ability; preserve `abilityPressed` plumbing for later content. Resize Pixi/camera on `ResizeObserver`, orientation, and DPR change without reconstructing `GameEngine`.

- [ ] **Step 6: Implement settings and runtime application**

Settings write through the save layer and immediately update renderer/audio. `AUTO` quality lowers presentation after FPS remains below 40 for 3 seconds and recovers conservatively after sustained improvement. Reduced Motion removes hit stops, zoom impulses, flashes, and shake but leaves text/palette feedback.

- [ ] **Step 7: Implement semantic audio adapter**

Export `AudioManager.play(event: AudioEvent): Promise<void>`, `setSettings(settings: AudioSettings): void`, `setMusicState(state: "NORMAL" | "BREAK_TIME" | "BOSS"): void`, and `destroy(): void`. Allow silent placeholder operation while retaining state transitions and safe error handling.

- [ ] **Step 8: Verify task output**

Run: `npm test -- --run src/input src/ui src/audio src/app/App.test.tsx`  
Expected: PASS.  
Run: `npm run typecheck && npm run build`  
Expected: both commands succeed.

- [ ] **Step 9: Commit**

```bash
git add src/input src/ui src/audio src/render src/app src/styles src/save
git commit -m "feat: add mobile controls and accessibility settings"
```

---

### Task 12: Stress Verification, Browser Validation, Balance Pass, and Release Gate

**Files:**
- Create: `src/game/stress.test.ts`
- Modify: `src/render/ParticleBudget.test.ts`
- Modify: `src/game/GameEngine.test.ts`
- Modify: `README.md`
- Modify: `package.json`
- Modify: any implementation file only when a failing release-gate test demonstrates a defect

**Interfaces:**
- Consumes: all prior tasks.
- Produces: documented local commands, deterministic stress coverage, verified production build, and browser-tested vertical slice.

- [ ] **Step 1: Add deterministic stress tests before optimization changes**

Create a dense fixture of at least 2,000 active blocks with explosive and lightning effects. Simulate an extreme proc build and assert:

```ts
expect(maxBreaksObservedPerTick).toBeLessThanOrEqual(150);
expect(maxChainDepthObserved).toBeLessThanOrEqual(8);
expect(rewardedBlockIds.size).toBe(totalRewardEvents);
expect(engine.getSnapshot().phase).not.toBe("BOOT");
```

Run the same seed at render-driving deltas for 30 FPS and 60 FPS while using the same fixed simulation time; assert equal destroyed-block IDs, XP, Run Coins, gauge, level, build, player position within numeric tolerance, and remaining run time.

- [ ] **Step 2: Add full-loop integration test**

With a short injected duration and deterministic upgrade choices, cover Home/start, mining, level-up, selecting an upgrade, BREAK TIME activation, Core Gate reward, Result, Credits award, Garage purchase, reload, and Play Again. Assert each phase transition and persisted value.

- [ ] **Step 3: Run the complete automated gate**

Run: `npm test -- --run`  
Expected: all tests pass with no unhandled rejections.  
Run: `npm run typecheck`  
Expected: exit code 0.  
Run: `npm run build`  
Expected: production bundle succeeds.

- [ ] **Step 4: Start the production-like preview and inspect desktop flow**

Run: `npm run build` then `npm run preview -- --host 127.0.0.1`. Verify in a browser:

- Home appears within three seconds after cold navigation.
- Start produces controllable gameplay within one second.
- WASD and arrows move/mine; opposing keys cancel.
- Level Up pauses timer and accepts keyboard/pointer selection.
- Bomb, Lightning, Drone, combo, BREAK TIME, Core Gate, Result, Garage, and Play Again are reachable with development diagnostics/grants, not weakened production balance.
- No unexpected console error appears.

- [ ] **Step 5: Inspect mobile and responsive flow**

Verify representative narrow portrait and landscape viewports. Check safe-area spacing, 44-pixel targets, virtual-stick release/cancel, no clipped modal/HUD, orientation without state loss, DPR-capped canvas resize, Settings, Reduced Motion, and automatic quality degradation under an intentionally constrained environment.

- [ ] **Step 6: Measure and adjust only centralized balance/config values**

Using development diagnostics, verify the intended shape: first level within 30 seconds, Bomb or Lightning likely within one minute, first BREAK TIME around 2-3 minutes, and increasing destruction throughput toward late run. Make tuning changes only in `src/data/balance.ts` and data definitions unless measurement reveals a logic defect. Record final production constants in README.

- [ ] **Step 7: Document operation and architecture**

README must contain prerequisites, install, dev, test, typecheck, build, preview, controls, save reset instructions, debug-panel access, architecture boundaries, production run duration, deferred Phase 2 features, and known placeholder asset/audio status.

- [ ] **Step 8: Run final clean verification**

From the committed lockfile state, run:

```bash
npm ci
npm test -- --run
npm run typecheck
npm run build
git status --short
```

Expected: dependency install succeeds, tests/typecheck/build pass, and only intentional verification artifacts—if any—remain untracked.

- [ ] **Step 9: Commit**

```bash
git add README.md package.json package-lock.json src
git commit -m "test: verify break miners vertical slice"
```

---

## Completion Gate

Do not claim the vertical slice complete until all of the following are true:

- The complete Home -> Run -> Result -> Garage -> Play Again loop works.
- PC keyboard and mobile touch both support movement-driven mining.
- Drill, Bomb, Lightning, and Drone upgrades alter behavior visibly and mechanically.
- Nuclear Bomb, Thunder God, and Drone Army can be verified without changing production prerequisites.
- BREAK TIME obeys its exact gauge/duration/reset rules.
- The production configuration is eight minutes.
- Save recovery and migrations pass hostile-input tests.
- Same-seed outcomes match across 30 FPS and 60 FPS render-driving schedules.
- Stress chains never exceed 150 breaks per tick or depth 8 and do not duplicate rewards.
- Portrait/landscape rotation preserves state and never leaves touch movement stuck.
- Reduced Motion, flash, shake, and quality settings behave as documented.
- All tests, strict typecheck, production build, desktop browser checks, mobile browser checks, and console checks pass.
