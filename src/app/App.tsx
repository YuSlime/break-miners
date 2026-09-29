import { useEffect, useRef, useState, type ReactElement } from "react";
import { GameEngine } from "../game/GameEngine";
import type { PixiRenderer } from "../render/PixiRenderer";
import { ErrorScreen } from "../ui/ErrorScreen";
import { HUD } from "../ui/HUD";
import { UpgradeModal } from "../ui/UpgradeModal";
import { ResultScreen } from "../ui/ResultScreen";
import { useEngineSnapshot } from "./useEngineSnapshot";
import { SaveManager } from "../save/SaveManager";
import type { SaveData } from "../save/saveTypes";
import {
  purchasePermanentUpgrade,
  type PermanentUpgradeId,
} from "../data/permanentUpgrades";
import { GarageScreen } from "../ui/GarageScreen";
import "../styles/app.css";

export interface AppProps {
  engine?: GameEngine;
}

export function App({ engine: providedEngine }: AppProps = {}): ReactElement {
  const [saveManager] = useState(() => new SaveManager(window.localStorage));
  const [initialLoad] = useState(() => saveManager.load());
  const [saveData, setSaveData] = useState<SaveData>(initialLoad.data);
  const saveDataRef = useRef(saveData);
  saveDataRef.current = saveData;
  const [saveWarning, setSaveWarning] = useState(initialLoad.warning ?? "");
  const [garageOpen, setGarageOpen] = useState(false);
  const [engine] = useState(
    () =>
      providedEngine ??
      new GameEngine({
          permanentUpgrades: initialLoad.data.upgrades,
          records: initialLoad.data.records,
          completedRuns: initialLoad.data.completedRuns,
        }),
  );
  const snapshot = useEngineSnapshot(engine);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiRenderer | undefined>(undefined);
  const [rendererStatus, setRendererStatus] = useState<
    "IDLE" | "LOADING" | "READY" | "ERROR"
  >("IDLE");
  const [rendererRetry, setRendererRetry] = useState(0);
  const awardedResults = useRef(new Set<string>());

  useEffect(() => {
    const result = snapshot.result;
    if (!result) return;
    const resultKey = `${String(result.seed)}:${result.reason}`;
    if (awardedResults.current.has(resultKey)) return;
    awardedResults.current.add(resultKey);
    setSaveData((current) => {
      const records = {
        deepestMeters: Math.max(current.records.deepestMeters, result.depthMeters),
        bestCombo: Math.max(current.records.bestCombo, result.bestCombo),
        mostBlocksBroken: Math.max(
          current.records.mostBlocksBroken,
          result.blocksBroken,
        ),
      };
      const next: SaveData = {
        ...current,
        credits: current.credits + result.awardedCredits,
        coreShards: current.coreShards + result.coreShards,
        completedRuns: current.completedRuns + 1,
        records,
      };
      const written = saveManager.save(next);
      if (!written.ok) setSaveWarning("Progress is kept for this session but could not be saved.");
      engine.setPersistentRunContext({
        upgrades: written.data.upgrades,
        records: written.data.records,
        completedRuns: written.data.completedRuns,
      });
      return written.data;
    });
  }, [engine, saveManager, snapshot.result]);

  useEffect(() => {
    const saveOnPageHide = () => {
      const written = saveManager.save(saveDataRef.current);
      if (!written.ok) setSaveWarning("Progress is kept for this session but could not be saved.");
    };
    window.addEventListener("pagehide", saveOnPageHide);
    return () => window.removeEventListener("pagehide", saveOnPageHide);
  }, [saveManager]);

  const purchase = (id: PermanentUpgradeId) => {
    const result = purchasePermanentUpgrade(saveData, id);
    if (!result.accepted) return;
    const written = saveManager.save(result.data);
    if (!written.ok) setSaveWarning("Purchase is active for this session but could not be saved.");
    setSaveData(written.data);
    engine.setPersistentRunContext({
      upgrades: written.data.upgrades,
      records: written.data.records,
      completedRuns: written.data.completedRuns,
    });
  };

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

  if (garageOpen && snapshot.phase === "MENU") {
    return (
      <GarageScreen
        onBack={() => setGarageOpen(false)}
        onPurchase={purchase}
        save={saveData}
      />
    );
  }

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
        {snapshot.phase === "LEVEL_UP" && (
          <UpgradeModal
            choices={snapshot.upgradeChoices}
            onReroll={() => engine.dispatch({ type: "REROLL_UPGRADES" })}
            onSelect={(upgradeId) =>
              engine.dispatch({ type: "SELECT_UPGRADE", upgradeId })
            }
            onSkip={() => engine.dispatch({ type: "SKIP_UPGRADE" })}
            rerollsRemaining={snapshot.rerollsRemaining}
          />
        )}
        {snapshot.phase === "RESULT" && snapshot.result && (
          <ResultScreen
            onGarage={() => {
              engine.dispatch({ type: "GO_HOME" });
              setGarageOpen(true);
            }}
            onHome={() => engine.dispatch({ type: "GO_HOME" })}
            onPlayAgain={() => engine.dispatch({ type: "PLAY_AGAIN" })}
            result={snapshot.result}
          />
        )}
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
        {saveWarning ? (
          <aside className="save-warning" role="status">
            {saveWarning}
            <button onClick={() => setSaveWarning("")} type="button">DISMISS</button>
          </aside>
        ) : null}
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
          <button className="secondary-button" onClick={() => setGarageOpen(true)} type="button">
            GARAGE
          </button>
          <button className="secondary-button" type="button">
            SETTINGS
          </button>
        </nav>
        <p className="home-credits">{saveData.credits} CREDITS · {saveData.coreShards} CORE</p>
      </section>
    </main>
  );
}
