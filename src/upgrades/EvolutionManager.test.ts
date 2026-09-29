import { EVOLUTIONS } from "../data/upgrades";
import { EvolutionManager } from "./EvolutionManager";

describe("EvolutionManager", () => {
  it("unlocks each evolution only at its exact prerequisite levels", () => {
    const evolutions = new EvolutionManager(EVOLUTIONS);

    expect(
      evolutions.getEligible({ mini_bomb: 5, bigger_boom: 2 }),
    ).not.toContain("nuclear_bomb");
    expect(
      evolutions.getEligible({ mini_bomb: 5, bigger_boom: 3 }),
    ).toContain("nuclear_bomb");

    expect(
      evolutions.getEligible({ chain_lightning: 5, overvolt: 3 }),
    ).toContain("thunder_god");
    expect(
      evolutions.getEligible({ mining_drone: 5, rapid_drone: 3 }),
    ).toContain("drone_army");
  });

  it("does not offer an evolution already owned", () => {
    const evolutions = new EvolutionManager(EVOLUTIONS);

    expect(
      evolutions.getEligible({
        mini_bomb: 5,
        bigger_boom: 3,
        nuclear_bomb: 1,
      }),
    ).not.toContain("nuclear_bomb");
  });
});
