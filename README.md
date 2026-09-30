# BREAK MINERS

BREAK MINERS is a deterministic React + PixiJS vertical slice of an eight-minute mining roguelite. Hold a movement direction to drill into blocks, form a run build from level-up choices, trigger chain reactions and BREAK TIME, destroy Core Gates, then convert the run into permanent Garage progression.

## Play online

[Play BREAK MINERS in your browser](https://yuslime.github.io/break-miners/)

## Requirements

- Node.js 22 or newer
- npm
- A modern browser with WebGL or Canvas support

## Local development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Keyboard movement supports WASD and arrow keys. Touch/coarse-pointer layouts display a virtual movement stick.

## Verification

```bash
npm run check
```

The check command runs the complete deterministic test suite, TypeScript validation, and a production Vite build. Individual commands are also available:

```bash
npm test -- --run
npm run typecheck
npm run build
```

## Architecture notes

- Gameplay advances at a fixed 60 Hz and is seeded for deterministic tests.
- React owns menus, HUD, results, Garage, settings, and accessibility controls.
- PixiJS owns world presentation; authoritative HP, rewards, and progression stay in gameplay systems.
- LocalStorage uses a validated versioned primary save plus backup recovery. Storage and audio failures are non-fatal.
- Gameplay queues cap per-tick work, total pending work, and chain depth to prevent unbounded reaction spikes.

The approved design and executable implementation plan live under `docs/superpowers/`.
