import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { GameEngine } from "../game/GameEngine";
import { StrictMode } from "react";

vi.mock("../render/PixiRenderer", () => ({
  PixiRenderer: {
    create: vi.fn().mockResolvedValue({
      consumeVisualEvents: vi.fn(),
      destroy: vi.fn(),
      render: vi.fn(),
      resize: vi.fn(),
      setQuality: vi.fn(),
    }),
  },
}));

beforeEach(() => localStorage.clear());

describe("App home screen", () => {
  it("offers the primary expedition and progression actions", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "BREAK MINERS" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "START EXPEDITION" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "GARAGE" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "SETTINGS" })).toBeEnabled();
  });

  it("keeps the engine live through the Strict Mode effect probe", async () => {
    const user = userEvent.setup();
    const engine = new GameEngine({ seed: 3 });
    render(<StrictMode><App engine={engine} /></StrictMode>);

    await user.click(screen.getByRole("button", { name: "START EXPEDITION" }));

    expect(engine.getSnapshot().phase).toBe("RUNNING");
  });

  it("persists a completed-run award and Garage purchase across an app rebuild", async () => {
    const user = userEvent.setup();
    const engine = new GameEngine({ seed: 9, runDurationSeconds: 1 / 60 });
    const first = render(<App engine={engine} />);
    await user.click(screen.getByRole("button", { name: "START EXPEDITION" }));
    act(() => engine.advance(1 / 60));
    expect(await screen.findByText("+10 CREDITS")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "GARAGE" }));
    await user.click(screen.getByRole("button", { name: "DRILL POWER 10 CREDITS" }));
    expect(screen.getByText("Lv 1 / 20")).toBeVisible();
    first.unmount();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "GARAGE" }));
    expect(screen.getByText("Lv 1 / 20")).toBeVisible();
    expect(screen.getByText("0 CREDITS", { selector: ".garage-header strong" })).toBeVisible();
  });

  it("applies and persists accessibility settings immediately", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(screen.getByRole("button", { name: "SETTINGS" }));
    const reducedMotion = screen.getByLabelText("Reduced Motion");
    expect(reducedMotion).not.toBeChecked();
    reducedMotion.focus();
    await user.keyboard(" ");
    expect(reducedMotion).toBeChecked();
    first.unmount();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "SETTINGS" }));
    expect(screen.getByLabelText("Reduced Motion")).toBeChecked();
  });
});
