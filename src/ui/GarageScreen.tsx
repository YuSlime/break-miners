import type { ReactElement } from "react";
import {
  PERMANENT_UPGRADES,
  permanentUpgradeCost,
  type PermanentUpgradeId,
} from "../data/permanentUpgrades";
import type { SaveData } from "../save/saveTypes";

export interface GarageScreenProps {
  save: Readonly<SaveData>;
  onPurchase(id: PermanentUpgradeId): void;
  onBack(): void;
}

export function GarageScreen({ save, onPurchase, onBack }: GarageScreenProps): ReactElement {
  return (
    <main className="garage-screen">
      <header className="garage-header">
        <div><p className="eyebrow">PERMANENT UPGRADES</p><h1>GARAGE</h1></div>
        <strong>{save.credits} CREDITS</strong>
      </header>
      <section className="garage-grid" aria-label="Permanent upgrades">
        {(Object.keys(PERMANENT_UPGRADES) as PermanentUpgradeId[]).map((id) => {
          const definition = PERMANENT_UPGRADES[id];
          const level = save.upgrades[id] ?? 0;
          const capped = level >= definition.maxLevel;
          const cost = permanentUpgradeCost(id, level);
          return (
            <article className="garage-card" key={id}>
              <div><small>{definition.unit}</small><h2>{definition.name}</h2></div>
              <p>{definition.description}</p>
              <strong>Lv {level} / {definition.maxLevel}</strong>
              <button
                aria-label={`${definition.name} ${capped ? "MAX" : `${cost} CREDITS`}`}
                className="secondary-button"
                disabled={capped || save.credits < cost}
                onClick={() => onPurchase(id)}
                type="button"
              >
                {capped ? "MAX" : `${cost} CREDITS`}
              </button>
            </article>
          );
        })}
      </section>
      <button className="secondary-button garage-back" onClick={onBack} type="button">BACK</button>
    </main>
  );
}
