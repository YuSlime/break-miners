import type { ReactElement } from "react";
import type { UISnapshot } from "../game/gameTypes";

export interface HUDProps {
  snapshot: Readonly<UISnapshot>;
}

export function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function HUD({ snapshot }: HUDProps): ReactElement {
  return (
    <div className="hud" aria-label="Expedition status">
      <section className="hud-panel hud-depth" aria-label="Depth and time">
        <strong>{snapshot.depthMeters}m</strong>
        <time>{formatTimer(snapshot.timeRemainingSeconds)}</time>
      </section>
      <section className="hud-panel hud-level" aria-label="Level and experience">
        <strong>LEVEL {snapshot.level}</strong>
        <div
          aria-label="Experience"
          aria-valuemax={snapshot.xpRequired}
          aria-valuemin={0}
          aria-valuenow={snapshot.xp}
          className="hud-meter"
          role="progressbar"
        >
          <span style={{ width: `${Math.min(100, (snapshot.xp / snapshot.xpRequired) * 100)}%` }} />
        </div>
      </section>
      <section className="hud-panel hud-currency" aria-label="Expedition rewards">
        <span><small>COINS</small><b>{snapshot.runCoins}</b></span>
        <span><small>CORE</small><strong>{snapshot.coreShards}</strong></span>
      </section>
      <section className="hud-break" aria-label="Destruction status">
        <div className="hud-break-label">
          <strong>BREAK</strong>
          <span>{snapshot.combo > 1 ? `${snapshot.combo} COMBO` : "BUILD THE CHAIN"}</span>
        </div>
        <div
          aria-label="Break gauge"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={snapshot.breakGauge}
          className="break-meter"
          role="progressbar"
        >
          <span style={{ width: `${snapshot.breakGauge}%` }} />
        </div>
      </section>
    </div>
  );
}
