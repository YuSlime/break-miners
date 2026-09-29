# BREAK MINERS Vertical-Slice Design

Date: 2026-09-30  
Status: Approved in conversation  
Source: Game Design & Technical Specification v1.0

## 1. Purpose

Build a new PC-, tablet-, and smartphone-compatible browser game named
BREAK MINERS. The first milestone is a production-shaped vertical slice that
proves the complete loop:

1. Start an expedition.
2. Move into blocks to mine them.
3. Gain XP and choose one of three upgrades.
4. Assemble Drill, Bomb, Lightning, or Drone builds.
5. Trigger escalating chain destruction and BREAK TIME.
6. Finish an eight-minute run and view the result.
7. Spend persistent currency in the Garage.
8. Start another run with permanent progression applied.

The most important player-facing transition is from breaking individual blocks
at the beginning of a run to causing screen-wide chain destruction near the
end. Mining impact, upgrade selection, chain reactions, and BREAK TIME receive
priority over secondary progression systems.

## 2. Scope

### Included in the vertical slice

- Responsive Home, Run, Level Up, Pause, Result, Garage, and Settings screens
- Keyboard and virtual-stick movement
- Movement-driven contact mining
- Seeded vertical chunk generation and depth tracking
- Stone, Copper, Iron, Crystal, Gold, Geode, Explosive Rock, and Core Gate
- Visual variants for Stone Cavern, Crystal Mine, and Magma Core
- XP, levels, three-choice upgrades, one reroll per run, and upgrade skip
- Drill, Bomb, Lightning, and Drone upgrade families
- Nuclear Bomb, Thunder God, and Drone Army evolutions
- Combo, BREAK Gauge, and eight-second BREAK TIME
- Eight-minute production run with configurable duration for tests
- Result records, Credits, minimal permanent Garage upgrades, and Play Again
- Versioned LocalStorage save, backup recovery, and migrations
- Responsive PC, portrait-mobile, and landscape-mobile layouts
- Particle quality, screen shake, flash, damage-number, and reduced-motion settings
- Development-only diagnostics
- Automated logic and integration tests plus desktop/mobile browser verification

### Deferred to later phases

- Pets, Fossils, Secret drops, Codex/Collection, and Rare Rooms
- Biome hazards and biome-specific events beyond visual/block weighting changes
- Multiplayer, backend accounts, cloud saves, trading, and monetization
- Daily challenges, leaderboards, achievements, prestige, and endless mode

Deferred features must not appear as disabled navigation in the first slice.

## 3. Invariants

The implementation must preserve these product requirements:

- Movement is the mining input; there is no separate normal-mining button.
- The mine extends vertically and the main direction of progress is downward.
- A production run lasts eight minutes.
- Level-up presents three distinct choices and pauses simulation time.
- BREAK TIME activates at 100 gauge, lasts eight seconds, gains no gauge while
  active, and resets the gauge to zero when it ends.
- Persistent upgrades affect subsequent runs.
- React does not own per-frame gameplay state.
- Gameplay results never depend on rendered particle count or frame rate.

## 4. Technical Architecture

Use Vite, React, TypeScript in strict mode, PixiJS, Vitest, and React Testing
Library. The application has three primary layers.

### React application layer

React owns screen routing, overlays, menus, HUD presentation, upgrade cards,
Garage, Settings, virtual controls, accessibility labels, and error/retry UI.
It receives immutable UI snapshots from the engine at approximately 10 Hz.
React state must not represent blocks, particles, projectiles, drones, or other
per-frame entities.

### GameEngine simulation layer

GameEngine owns phase transitions, the simulation clock, player movement,
collision, mining, world state, depth, XP, upgrades, damage, queues, drones,
combo, BREAK TIME, Core Gates, the run timer, and seeded randomness. Systems
communicate through typed commands and gameplay events rather than importing UI
components.

### PixiJS rendering layer

PixiJS owns the canvas, camera transforms, block/player/drone display objects,
particles, flashes, lightning, explosions, loot visuals, damage numbers, and
screen shake. Rendering consumes engine state and visual events but cannot
change authoritative gameplay state.

The renderer and React shell are replaceable consumers of GameEngine. Core
gameplay logic therefore remains testable without a browser canvas.

## 5. Project Boundaries

The implementation should use focused modules with the following ownership:

```text
src/
  app/          React shell, screen routing, providers
  game/         GameEngine, loop, phases, commands, events, snapshots
  world/        chunks, generation, blocks, depth, biome selection
  player/       movement, collision, mining
  combat/       damage, break queue, explosions, lightning
  abilities/    drones, combo, BREAK TIME
  upgrades/     definitions, selection, effects, evolutions
  render/       Pixi renderer, camera, pools, visual budgets
  audio/        audio state and playback adapter
  save/         schema, validation, migrations, backup, persistence
  ui/           React screens and overlays
  input/        keyboard, pointer, virtual stick, normalized snapshots
  data/         blocks, upgrades, permanent upgrades, balance
  test/         shared fixtures and deterministic engine helpers
```

No single system should combine simulation, rendering, and React UI concerns.

## 6. State and Data Flow

The application uses the following authoritative phases:

```ts
type GamePhase =
  | "BOOT"
  | "MENU"
  | "RUNNING"
  | "LEVEL_UP"
  | "PAUSED"
  | "RESULT";
```

The main data flow is:

```text
Keyboard / touch
  -> normalized InputSnapshot
  -> GameEngine fixed-step simulation
  -> gameplay events and authoritative state
  -> Pixi render state each animation frame
  -> throttled UISnapshot for React
```

React sends discrete commands such as start run, select upgrade, reroll, skip,
pause, resume, buy permanent upgrade, and change setting. It never edits engine
objects directly.

## 7. Game Loop and Time

Use `requestAnimationFrame` for presentation and an accumulator-driven fixed
simulation step of 1/60 second. One animation frame may execute zero or several
simulation steps. Clamp incoming frame delta and cap catch-up steps so a tab
resume cannot cause a simulation spiral.

Mining pulse, cooldowns, drone attacks, combo decay, BREAK TIME, and run time
are simulation-time based. `LEVEL_UP`, `PAUSED`, and hidden-tab states do not
advance the run timer. BREAK TIME visual slow motion does not change the
authoritative relationship between its duration and the run timer.

The production duration is 480 seconds. Tests and development tools may inject
a shorter duration through balance configuration without changing production
defaults.

## 8. World Generation

- Tile size: 32 logical pixels
- Chunk size: 20 by 12 tiles
- World direction: increasing Y means increasing depth
- Generation input: run seed plus chunk coordinates
- Active set: chunks near the camera/player only
- Destroyed blocks: stored as run-local chunk deltas
- Inactive distant chunks: suspended or released

The generator guarantees at least one mineable downward route, with lateral
variation to avoid a visibly straight corridor. Depth determines biome, block
weights, HP scaling, background palette, and ambient effects. Generation must
be deterministic for the same seed and coordinates.

## 9. Movement and Mining

Keyboard, D-pad/virtual stick, and future controller input normalize to:

```ts
interface InputSnapshot {
  moveX: number;
  moveY: number;
  abilityPressed: boolean;
}
```

The player moves immediately through free space with little or no inertia. On
contact with a block in the intended direction, movement stops at the boundary
and mining begins automatically. Mining applies time-based damage in 0.1-second
pulses. If the direction remains held when the block breaks, movement resumes
without requiring a new input.

The normalized `abilityPressed` input is part of the input boundary because the
source specification reserves Space and a mobile Ability button. The first
slice does not invent an active ability that the product specification has not
defined. Until an upgrade or later feature provides one, the input has no
gameplay effect and no inactive Ability button is rendered.

Contact feedback begins within 0.1 seconds and includes hit flash, a lightweight
sound cue, and visible damage to the block. Ordinary blocks do not display HP
bars. Geodes, Core Gates, and other high-HP special blocks may display them.

## 10. Destruction Pipeline

For every authoritative block break, process effects in this order:

1. Mark the block destroyed.
2. Award XP.
3. Award Run Coins.
4. Update combo.
5. Update BREAK Gauge when permitted.
6. Enqueue on-break effects.
7. Roll and enqueue loot.
8. Emit budgeted visual/audio events.

Chain reactions are iterative, not recursive. Use separate bounded queues for
breaks, explosions, lightning, loot, and visuals. The initial limits are 150
block breaks per simulation tick and a maximum proc-chain depth of 8. Remaining
valid work carries into later ticks. Secondary proc probability may decay by
chain depth. Duplicate attempts against an already destroyed block are ignored.

Gameplay destruction and presentation are separate. Visual budgeting may omit
distant or redundant particles but must never omit damage, rewards, or upgrade
effects.

## 11. Progression and Upgrade Selection

Breaking blocks awards XP according to block data. Required XP follows the
balance configuration based on `10 + level^1.45 * 4`, with rounding defined in
one helper.

On level-up, simulation enters `LEVEL_UP` and presents three unique eligible
cards. Selection rules are:

- Exclude upgrades already at maximum level.
- Do not duplicate an upgrade in one choice.
- Apply Luck to rarity weights through a normalized weight transform.
- Increase evolution weight when all evolution prerequisites are satisfied.
- Start each run with one reroll.
- Skipping awards a small configured amount of Run Coins.
- Bias the first minute's eligible pool so a new player is likely, but not
  guaranteed, to see Bomb or Lightning.

Definitions contain IDs, names, category, rarity, levels, numeric values,
descriptions, and prerequisites. Systems implement behavior keyed by typed IDs.
Definitions and balance values are not scattered through UI components.

The first slice includes Nuclear Bomb, Thunder God, and Drone Army using the
requirements in the source specification. Development tools may grant levels
for verification, but production requirements are not weakened.

## 12. Combo and BREAK TIME

Combo increases when blocks are destroyed and begins decaying after 1.2 seconds
without a break. Milestones at 10, 25, 50, 100, 250, and 500 emit increasingly
strong but budgeted presentation events.

BREAK Gauge gains the configured amount per block type. At 100 it starts an
eight-second state with:

- Mining speed +50%
- Move speed +20%
- Explosion proc contribution +25%
- Reward +30%

Gauge gain is disabled during BREAK TIME and the gauge becomes zero on exit.
Presentation may include a short hit stop, camera zoom, label, palette shift,
music-state change, and higher-energy effects. Reduced Motion suppresses or
softens flash, zoom, shake, and hit stop without changing gameplay bonuses.

## 13. Run, Results, and Permanent Progression

The production run ends when its 480-second timer reaches zero. The engine stops
destruction, discards unprocessed break/combat/loot queue entries, freezes input,
and creates an immutable result snapshot containing depth, blocks broken, best
combo, Run Coins, awarded Credits, Core Shards, Geodes, build, and record
changes. Effects already processed before the timer reached zero remain valid;
queued effects do not grant post-run damage or rewards.

Run Coins are temporary score/reward currency earned from block destruction and
other run effects. At Result they convert to persistent Credits using one
balance-configured conversion function. Only Credits are stored in SaveData and
spent in the Garage. This keeps mid-run reward modifiers deterministic while
preventing partially processed runs from writing persistent currency directly.

The first slice provides permanent upgrades for Drill Power, Move Speed, Crit
Chance, Crit Damage, Luck, Magnet, Starting XP, and Core Bonus. Costs and caps
come from data definitions. A first completed run guarantees enough Credits for
at least one entry-level purchase. `PLAY AGAIN` immediately creates a new seed
and run using the latest permanent upgrades.

## 14. UI and Responsive Behavior

Home emphasizes one large `START EXPEDITION` action, with Garage and Settings
as secondary actions. Run HUD placement is:

- Top center: depth and timer
- Top left: level and XP
- Top right: Run Coins and Core Shards
- Bottom center: BREAK Gauge
- Right edge: rare-drop feed
- Mobile bottom left: virtual stick
- Mobile bottom right: ability button

Touch targets are at least 44 CSS pixels. Portrait prioritizes controls and the
player's immediate mining direction. Landscape exposes more horizontal world.
Canvas logical resolution is independent of device pixel ratio, and DPR is
capped to protect mobile performance. Orientation changes resize renderer and
camera without rebuilding or resetting the run.

## 15. Save Model

The initial persistent schema is:

```ts
interface SaveData {
  version: number;
  credits: number;
  coreShards: number;
  upgrades: Record<string, number>;
  records: RecordData;
  settings: SettingsData;
  recentDrops: DropHistoryEntry[];
}
```

Validate untrusted LocalStorage data before use. Load the primary save, then a
backup, then a safe default. Each schema version has an explicit migration.
Save after run completion, Garage purchase, settings changes, periodic safe
points, and `pagehide`. Storage errors show a non-blocking warning and retain
session state in memory.

## 16. Rendering, Audio, and Performance

Pool particles, damage text, explosion visuals, lightning visuals, projectiles,
and loot visuals. Quality levels are AUTO, LOW, MEDIUM, and HIGH. AUTO reduces
only presentation cost after sustained low FPS. It may lower particle count and
lifetime, disable shadows, soften glow/flash, omit offscreen effects, and reduce
damage-number density.

It must never alter damage, block breaks, XP, loot probability, world layout,
upgrade effects, or timer behavior. Initial visual budgets target 300-500
particles on mobile and 1000-2000 on desktop, subject to measured behavior.

Audio is accessed through an adapter that accepts semantic events such as mine,
break, explosion, lightning, rare drop, BREAK TIME start, and boss state.
Autoplay denial or decoding failure must leave gameplay operational. Initial
development may use generated/simple placeholder sounds or silence while
preserving the adapter and state transitions.

## 17. Accessibility and Settings

Implement Master Volume, Music, SFX, particle quality, camera shake percentage,
damage numbers, screen flash, vibration, FPS limit, and Reduced Motion.
Reduced Motion defaults from the browser preference on first launch but remains
user-overridable. Flash and shake never convey information unavailable through
text, HUD, or other stable visual changes.

## 18. Error Handling and Diagnostics

- Pixi initialization failure: show a recoverable error screen with retry.
- Save failure: continue with in-memory data and a non-blocking warning.
- Audio failure: continue silently.
- Invalid upgrade definition: exclude it; report loudly in development.
- Long frame or tab resume: clamp delta and limit catch-up work.
- Queue growth: enforce per-tick and total queue limits; expose diagnostics.
- Unexpected engine error: stop the run safely and preserve persistent data.

A development-only diagnostics overlay reports FPS, entities, particles, active
chunks, queue lengths, seed, depth, and damage per second.

## 19. Testing and Verification

### Unit tests

- Seeded RNG and chunk determinism
- Block HP scaling and damage calculation
- Critical chance and damage behavior
- Required-XP calculation
- Unique upgrade choices and maximum-level exclusion
- Luck rarity adjustment and evolution eligibility
- Ordered block-break rewards/effects
- Chain-depth and per-tick queue limits
- BREAK TIME gauge and duration rules
- Save validation, backup fallback, and migrations
- Number formatting

### Integration tests

- Input to movement to contact mining to block break to XP
- Level-up and pause stopping simulation time
- Hidden-tab resume avoiding elapsed-time advancement
- Explosion and lightning queue chains
- Drone target acquisition and attacks
- BREAK TIME entry, modifiers, and exit
- Timer end to immutable result snapshot
- Credits persistence and Garage purchase after reload

### Browser verification

- Current Chrome/Edge desktop keyboard flow
- Mobile viewport touch controls
- Portrait and landscape layouts
- Orientation change without state loss
- Level-up and Result overlays within the viewport
- Large chain reactions without a frozen interface
- No unexpected console errors
- Successful strict typecheck, automated tests, and production build

## 20. Implementation Milestones

Each milestone must leave the application runnable:

1. Scaffold, React shell, Pixi canvas, test harness, and balance data
2. Fixed loop, input, player, and camera
3. Block grid, collision, contact mining, and destruction feedback
4. Seeded chunks, depth, biome selection, and active-chunk lifecycle
5. XP, levels, three-choice upgrades, reroll, and skip
6. Bomb, Lightning, Drone, and three evolutions
7. Combo, BREAK Gauge, and BREAK TIME
8. Core Gates, run timer, result snapshot, and Play Again
9. Credits, Garage, records, save validation, and migration
10. Mobile controls, responsive HUD, orientation, and accessibility settings
11. Pools, visual/audio events, quality adaptation, and diagnostics
12. Full test suite, production build, desktop/mobile browser verification, and
    measured balance/performance adjustment

## 21. Acceptance Criteria

The vertical slice is complete when:

- A player can complete the entire Home-to-Run-to-Result-to-Garage-to-Run loop.
- Keyboard and touch movement both support movement-driven mining.
- XP, level-up choices, and all four initial build families function.
- Bomb, Lightning, and Drone builds produce meaningful, bounded chain effects.
- BREAK TIME activates and ends according to its invariant rules.
- Production configuration supports an eight-minute run.
- Permanent upgrades survive reload and affect the next run.
- Portrait and landscape layouts remain operable and inside the viewport.
- Simulation outcome is stable across render frame rates.
- Stress chains respect queue limits without freezing the browser.
- Strict typecheck, tests, production build, and browser console checks pass.

## 22. Explicit Decisions

- The first implementation is a vertical slice, not all Phase 2-4 content.
- The project is new; there is no existing codebase to preserve.
- Procedural and CSS/Pixi-generated placeholder art is acceptable initially.
- Audio architecture is included; bespoke final audio assets are not required
  for the first code-complete milestone.
- The repository is currently absent. Source control initialization and commit
  policy are separate from this design and should not be assumed silently.
