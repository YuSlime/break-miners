import type { ReactElement } from "react";
import type { UpgradeChoice } from "../upgrades/UpgradeManager";
import type { UpgradeId } from "../data/upgrades";

export interface UpgradeModalProps {
  choices: readonly UpgradeChoice[];
  rerollsRemaining: number;
  onSelect: (id: UpgradeId) => void;
  onReroll: () => void;
  onSkip: () => void;
}

export function UpgradeModal({
  choices,
  rerollsRemaining,
  onSelect,
  onReroll,
  onSkip,
}: UpgradeModalProps): ReactElement {
  return (
    <section
      aria-labelledby="upgrade-heading"
      aria-modal="true"
      className="upgrade-overlay"
      role="dialog"
    >
      <header>
        <p className="eyebrow">DRILL SYSTEM EVOLVING</p>
        <h2 id="upgrade-heading">CHOOSE AN UPGRADE</h2>
      </header>
      <div className="upgrade-grid">
        {choices.map((choice) => (
          <button
            aria-label={`Choose ${choice.name}`}
            className={`upgrade-card rarity-${choice.rarity.toLowerCase()}`}
            key={choice.id}
            onClick={() => onSelect(choice.id)}
            type="button"
          >
            <span className="upgrade-category">{choice.category}</span>
            <strong>{choice.name}</strong>
            <small>{choice.rarity}</small>
            <p>{choice.description}</p>
            <span>Lv {choice.currentLevel} → {choice.nextLevel}</span>
          </button>
        ))}
      </div>
      <footer className="upgrade-actions">
        <button
          className="secondary-button"
          disabled={rerollsRemaining <= 0}
          onClick={onReroll}
          type="button"
        >
          REROLL {rerollsRemaining}
        </button>
        <button className="secondary-button" onClick={onSkip} type="button">
          SKIP +5 COINS
        </button>
      </footer>
    </section>
  );
}
