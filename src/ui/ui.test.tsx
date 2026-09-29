import { render, screen } from "@testing-library/react";
import type { UISnapshot } from "../game/gameTypes";
import { HUD } from "./HUD";
import { UpgradeModal } from "./UpgradeModal";

const snapshot: UISnapshot = {
  phase: "RUNNING",
  depthMeters: 125,
  timeRemainingSeconds: 462,
  level: 4,
  xp: 18,
  xpRequired: 30,
  runCoins: 320,
  coreShards: 2,
  combo: 17,
  breakGauge: 68,
  breakTimeRemainingSeconds: 0,
  upgradeChoices: [],
  rerollsRemaining: 1,
};

describe("HUD", () => {
  it("shows the run snapshot in accessible edge-aligned regions", () => {
    render(<HUD snapshot={snapshot} />);

    expect(screen.getByText("125m")).toBeVisible();
    expect(screen.getByText("07:42")).toBeVisible();
    expect(screen.getByText("LEVEL 4")).toBeVisible();
    expect(screen.getByLabelText("Experience")).toHaveAttribute("aria-valuenow", "18");
    expect(screen.getByText("320")).toBeVisible();
    expect(screen.getByText("2", { selector: "strong" })).toBeVisible();
    expect(screen.getByLabelText("Break gauge")).toHaveAttribute("aria-valuenow", "68");
  });

  it("does not render health bars for ordinary blocks", () => {
    render(<HUD snapshot={snapshot} />);

    expect(screen.queryByLabelText(/block health/i)).not.toBeInTheDocument();
  });

  it("announces active BREAK TIME with its remaining duration", () => {
    render(
      <HUD
        snapshot={{ ...snapshot, breakGauge: 100, breakTimeRemainingSeconds: 7.5 }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("BREAK TIME 7.5s");
  });
});

describe("UpgradeModal", () => {
  it("presents three upgrades with levels plus reroll and skip actions", () => {
    const onSelect = vi.fn();
    render(
      <UpgradeModal
        choices={[
          { id: "power_drill", name: "POWER DRILL", category: "DRILL", rarity: "COMMON", currentLevel: 0, nextLevel: 1, effectValue: 0.25, description: "Drill Power +25%", evolution: false },
          { id: "mini_bomb", name: "MINI BOMB", category: "BOMB", rarity: "COMMON", currentLevel: 1, nextLevel: 2, effectValue: 0.2, description: "Block breaks can explode", evolution: false },
          { id: "chain_lightning", name: "CHAIN LIGHTNING", category: "LIGHTNING", rarity: "RARE", currentLevel: 2, nextLevel: 3, effectValue: 5, description: "Lightning chains to more blocks", evolution: false },
        ]}
        onReroll={() => undefined}
        onSelect={onSelect}
        onSkip={() => undefined}
        rerollsRemaining={1}
      />,
    );

    expect(screen.getAllByRole("button", { name: /choose/i })).toHaveLength(3);
    expect(screen.getByText("Lv 0 → 1")).toBeVisible();
    expect(screen.getByText("Lv 1 → 2")).toBeVisible();
    expect(screen.getByRole("button", { name: "REROLL 1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "SKIP +5 COINS" })).toBeEnabled();
  });
});
