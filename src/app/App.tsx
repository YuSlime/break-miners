import type { ReactElement } from "react";
import "../styles/app.css";

export function App(): ReactElement {
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
