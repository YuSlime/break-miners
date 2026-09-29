import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
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
import { SettingsScreen, settingsWithSystemMotionPreference } from "../ui/SettingsScreen";
import { InputController } from "../input/InputController";
import { KeyboardInput } from "../input/KeyboardInput";
import { VirtualStick } from "../input/VirtualStick";
import { AudioManager, type AudioEventType } from "../audio/AudioManager";
import "../styles/app.css";

export interface AppProps {
  engine?: GameEngine;
}

export function App({ engine: providedEngine }: AppProps = {}): ReactElement {
  const [saveManager] = useState(() => new SaveManager(window.localStorage));
  const [initialLoad] = useState(() => {
    const loaded = saveManager.load();
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      ...loaded,
      data: {
        ...loaded.data,
        settings: settingsWithSystemMotionPreference(
          loaded.data.settings,
          loaded.source !== "DEFAULT",
          prefersReducedMotion,
        ),
      },
    };
  });
  const [saveData, setSaveData] = useState<SaveData>(initialLoad.data);
  const saveDataRef = useRef(saveData);
  saveDataRef.current = saveData;
  const [saveWarning, setSaveWarning] = useState(initialLoad.warning ?? "");
  const [garageOpen, setGarageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inputController] = useState(() => new InputController());
  const [audio] = useState(() => new AudioManager());
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
  const setTouchVector = useCallback(
    (x: number, y: number) => inputController.setTouchVector(x, y),
    [inputController],
  );

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

  const updateSettings = (settings: SaveData["settings"]) => {
    const written = saveManager.save({ ...saveData, settings });
    if (!written.ok) {
      setSaveWarning("Settings are active for this session but could not be saved.");
    }
    setSaveData(written.data);
  };

  useEffect(() => {
    audio.setSettings(saveData.settings);
    rendererRef.current?.setQuality({
      deviceClass:
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches
          ? "MOBILE"
          : "DESKTOP",
      quality: saveData.settings.quality,
      reducedMotion: saveData.settings.reducedMotion,
      screenFlash: saveData.settings.screenFlash,
      cameraShakePercent: saveData.settings.cameraShakePercent,
    });
  }, [audio, saveData.settings]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      engine.setDocumentHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const keyboard = new KeyboardInput(inputController);

    let frameId: number | undefined;
    let previousTime: number | undefined;
    let previousRenderTime = 0;
    const frame = (time: number) => {
      if (previousTime !== undefined) {
        engine.dispatch({ type: "SET_INPUT", input: inputController.snapshot() });
        engine.advance((time - previousTime) / 1000);
      }
      const renderState = engine.getRenderState();
      rendererRef.current?.consumeVisualEvents(renderState.visualEvents);
      for (const event of renderState.visualEvents) {
        const type: AudioEventType | undefined =
          event.type === "BLOCK_HIT" ? "MINE" :
          event.type === "BLOCK_BREAK" ? "BLOCK_BREAK" :
          event.type === "EXPLOSION" ? "EXPLOSION" :
          event.type === "LIGHTNING" ? "LIGHTNING" :
          event.type === "BREAK_TIME_START" ? "BREAK_TIME_START" :
          event.type === "CORE_GATE_DESTROYED" ? "CORE_GATE" : undefined;
        if (type) void audio.play({ type, combo: engine.getSnapshot().combo });
      }
      const frameInterval = 1000 / saveDataRef.current.settings.fpsLimit;
      if (time - previousRenderTime + Number.EPSILON >= frameInterval) {
        rendererRef.current?.render(renderState, 0);
        previousRenderTime = time;
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
      keyboard.destroy();
      audio.destroy();
      engine.destroy();
    };
  }, [audio, engine, inputController]);

  useEffect(() => {
    if (snapshot.phase === "MENU" || !canvasHostRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let resize = () => undefined;
    setRendererStatus("LOADING");

    void import("../render/PixiRenderer")
      .then(({ PixiRenderer }) =>
        PixiRenderer.create({
          container: canvasHostRef.current!,
          resolutionCap: 2,
          reducedMotion: saveDataRef.current.settings.reducedMotion,
        }),
      )
      .then((renderer) => {
        if (cancelled) {
          renderer.destroy();
          return;
        }
        rendererRef.current = renderer;
        resize = () => {
          const host = canvasHostRef.current;
          if (!host) return;
          renderer.resize(host.clientWidth, host.clientHeight, window.devicePixelRatio);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvasHostRef.current!);
        window.addEventListener("orientationchange", resize);
        window.addEventListener("resize", resize);
        resize();
        renderer.setQuality({
          deviceClass:
            typeof window.matchMedia === "function" &&
            window.matchMedia("(pointer: coarse)").matches
              ? "MOBILE"
              : "DESKTOP",
          quality: saveDataRef.current.settings.quality,
          reducedMotion: saveDataRef.current.settings.reducedMotion,
          screenFlash: saveDataRef.current.settings.screenFlash,
          cameraShakePercent: saveDataRef.current.settings.cameraShakePercent,
        });
        setRendererStatus("READY");
      })
      .catch(() => {
        if (!cancelled) setRendererStatus("ERROR");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener("orientationchange", resize);
      window.removeEventListener("resize", resize);
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

  if (settingsOpen && snapshot.phase === "MENU") {
    return (
      <SettingsScreen
        onBack={() => setSettingsOpen(false)}
        onChange={updateSettings}
        settings={saveData.settings}
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
        {snapshot.phase === "RUNNING" ? (
          <VirtualStick onVector={setTouchVector} />
        ) : null}
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
          <button className="secondary-button" onClick={() => setSettingsOpen(true)} type="button">
            SETTINGS
          </button>
        </nav>
        <p className="home-credits">{saveData.credits} CREDITS · {saveData.coreShards} CORE</p>
      </section>
    </main>
  );
}
