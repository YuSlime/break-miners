import { render, screen } from "@testing-library/react";
import { App } from "./App";

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
});
