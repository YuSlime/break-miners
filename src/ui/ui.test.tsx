import { render, screen } from "@testing-library/react";
import type { UISnapshot } from "../game/gameTypes";
import { HUD } from "./HUD";

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
});
