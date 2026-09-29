import { useSyncExternalStore } from "react";
import type { GameEngine } from "../game/GameEngine";
import type { UISnapshot } from "../game/gameTypes";

export function useEngineSnapshot(engine: GameEngine): UISnapshot {
  return useSyncExternalStore(
    engine.subscribeSnapshot,
    engine.getSnapshot,
    engine.getSnapshot,
  );
}
