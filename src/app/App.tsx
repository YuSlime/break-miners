import { useEffect, useState, type ReactElement } from "react";
import { GameEngine } from "../game/GameEngine";
import { useEngineSnapshot } from "./useEngineSnapshot";
import "../styles/app.css";

export function App(): ReactElement {
  const [engine] = useState(() => new GameEngine());
  const snapshot = useEngineSnapshot(engine);

  useEffect(() => {
    const handleVisibilityChange = () => {
      engine.setDocumentHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let frameId: number | undefined;
    let previousTime: number | undefined;
    const frame = (time: number) => {
      if (previousTime !== undefined) {
        engine.advance((time - previousTime) / 1000);
      }
      previousTime = time;
      frameId = requestAnimationFrame(frame);
    };
    if (typeof requestAnimationFrame === "function") {
      frameId = requestAnimationFrame(frame);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      engine.destroy();
    };
  }, [engine]);

  if (snapshot.phase !== "MENU") {
    return (
      <main className="app-shell">
        <section className="run-shell" aria-label="Expedition in progress">
          <p className="eyebrow">EXPEDITION TIMER</p>
          <h1>{Math.ceil(snapshot.timeRemainingSeconds)}</h1>
          <button
            className="secondary-button"
            onClick={() =>
              engine.dispatch({
                type: snapshot.phase === "PAUSED" ? "RESUME" : "PAUSE",
              })
            }
            type="button"
          >
            {snapshot.phase === "PAUSED" ? "RESUME" : "PAUSE"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <section className="home-panel" aria-labelledby="game-title">
        <p className="eyebrow">DEEP CORE EXPEDITION</p>
        <h1 id="game-title">BREAK MINERS</h1>
        <p className="tagline">
          Build the drill. Break the mine. Go deeper.
        </p>
        <button
          aria-describedby="start-expedition-description"
          aria-label="START EXPEDITION"
          className="start-button"
          onClick={() => engine.dispatch({ type: "START_RUN" })}
          type="button"
        >
          <span>START EXPEDITION</span>
          <small id="start-expedition-description">DESCEND INTO THE MINE</small>
        </button>
        <nav className="home-actions" aria-label="Base facilities">
          <button className="secondary-button" type="button">
            GARAGE
          </button>
          <button className="secondary-button" type="button">
            SETTINGS
          </button>
        </nav>
      </section>
    </main>
  );
}
