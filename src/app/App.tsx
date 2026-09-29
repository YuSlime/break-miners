import { useEffect, useRef, useState, type ReactElement } from "react";
import { GameEngine } from "../game/GameEngine";
import type { PixiRenderer } from "../render/PixiRenderer";
import { ErrorScreen } from "../ui/ErrorScreen";
import { HUD } from "../ui/HUD";
import { useEngineSnapshot } from "./useEngineSnapshot";
import "../styles/app.css";

export function App(): ReactElement {
  const [engine] = useState(() => new GameEngine());
  const snapshot = useEngineSnapshot(engine);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiRenderer | undefined>(undefined);
  const [rendererStatus, setRendererStatus] = useState<
    "IDLE" | "LOADING" | "READY" | "ERROR"
  >("IDLE");
  const [rendererRetry, setRendererRetry] = useState(0);

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
      const renderState = engine.getRenderState();
      rendererRef.current?.consumeVisualEvents(renderState.visualEvents);
      rendererRef.current?.render(renderState, 0);
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

  useEffect(() => {
    if (snapshot.phase === "MENU" || !canvasHostRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    setRendererStatus("LOADING");

    void import("../render/PixiRenderer")
      .then(({ PixiRenderer }) =>
        PixiRenderer.create({
          container: canvasHostRef.current!,
          resolutionCap: 2,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        }),
      )
      .then((renderer) => {
        if (cancelled) {
          renderer.destroy();
          return;
        }
        rendererRef.current = renderer;
        const resize = () => {
          const host = canvasHostRef.current;
          if (!host) return;
          renderer.resize(host.clientWidth, host.clientHeight, window.devicePixelRatio);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvasHostRef.current!);
        resize();
        setRendererStatus("READY");
      })
      .catch(() => {
        if (!cancelled) setRendererStatus("ERROR");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      rendererRef.current?.destroy();
      rendererRef.current = undefined;
    };
  }, [rendererRetry, snapshot.phase]);

  if (snapshot.phase !== "MENU") {
    return (
      <main className="run-screen">
        <div className="game-stage" ref={canvasHostRef} />
        {rendererStatus === "LOADING" && (
          <p className="loading-status" role="status">INITIALIZING MINE…</p>
        )}
        {rendererStatus === "ERROR" && (
          <ErrorScreen
            message="The graphics renderer could not start."
            onRetry={() => setRendererRetry((value) => value + 1)}
          />
        )}
        <HUD snapshot={snapshot} />
        <section className="run-controls" aria-label="Expedition controls">
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
