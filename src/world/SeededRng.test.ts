import { SeededRng } from "./SeededRng";

describe("SeededRng", () => {
  it("replays the same bounded sequence for the same seed", () => {
    const first = new SeededRng(12345);
    const second = new SeededRng(12345);

    const firstValues = Array.from({ length: 100 }, () => first.next());
    const secondValues = Array.from({ length: 100 }, () => second.next());

    expect(secondValues).toEqual(firstValues);
    expect(firstValues.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("forks a reproducible stream without advancing its parent", () => {
    const parent = new SeededRng("expedition-alpha");
    const control = new SeededRng("expedition-alpha");

    const firstFork = parent.fork("chunk:2:9");
    const secondFork = parent.fork("chunk:2:9");

    expect(Array.from({ length: 8 }, () => firstFork.next())).toEqual(
      Array.from({ length: 8 }, () => secondFork.next()),
    );
    expect(parent.next()).toBe(control.next());
  });

  it("rejects an empty collection", () => {
    const rng = new SeededRng(1);

    expect(() => rng.pick([])).toThrow("Cannot pick from an empty collection");
  });
});
