import { GameEngine, type GameEngineOptions } from "../game/GameEngine";

export function createTestEngine(options: GameEngineOptions = {}): GameEngine {
  return new GameEngine({ seed: "test-seed", ...options });
}
