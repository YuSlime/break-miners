import type { ReactElement } from "react";
import type { RunResult } from "../run/resultTypes";

export interface ResultScreenProps {
  result: Readonly<RunResult>;
  onPlayAgain(): void;
  onGarage(): void;
  onHome(): void;
}

const RECORD_LABELS = {
  deepestMeters: "DEPTH",
  bestCombo: "BEST COMBO",
  mostBlocksBroken: "BLOCKS",
} as const;

export function ResultScreen({
  result,
  onPlayAgain,
  onGarage,
  onHome,
}: ResultScreenProps): ReactElement {
  return (
    <section className="result-overlay" aria-labelledby="result-title">
      <p className="eyebrow">RUN SUMMARY</p>
      <h2 id="result-title">EXPEDITION COMPLETE</h2>
      <div className="result-grid">
        <article><small>DEPTH</small><strong>{result.depthMeters}m</strong></article>
        <article><small>BLOCKS</small><strong>{result.blocksBroken}</strong></article>
        <article><small>BEST COMBO</small><strong>{result.bestCombo}</strong></article>
        <article><small>RUN COINS</small><strong>{result.runCoins}</strong></article>
        <article><small>CORE SHARDS</small><strong>{result.coreShards}</strong></article>
        <article><small>GEODES</small><strong>{result.geodes}</strong></article>
      </div>
      <strong className="credits-award">+{result.awardedCredits} CREDITS</strong>
      {result.recordChanges.length > 0 ? (
        <ul className="record-list" aria-label="New records">
          {result.recordChanges.map((change) => (
            <li key={change.record}>
              <small>{RECORD_LABELS[change.record]}</small>
              NEW RECORD {change.previous} → {change.current}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="result-actions">
        <button className="start-button" onClick={onPlayAgain} type="button">
          <span>PLAY AGAIN</span>
        </button>
        <button className="secondary-button" onClick={onGarage} type="button">GARAGE</button>
        <button className="secondary-button" onClick={onHome} type="button">HOME</button>
      </div>
    </section>
  );
}
