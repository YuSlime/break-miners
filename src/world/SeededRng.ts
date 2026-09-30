function hashSeed(value: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

export class SeededRng {
  readonly #seedKey: string;
  #state: number;

  constructor(seed: number | string) {
    this.#seedKey = String(seed);
    this.#state = hashSeed(this.#seedKey);
  }

  next(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let value = this.#state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
      throw new TypeError("Random integer bounds must be integers");
    }
    if (maxInclusive < minInclusive) {
      throw new RangeError("Maximum bound must be greater than or equal to minimum");
    }

    return (
      minInclusive +
      Math.floor(this.next() * (maxInclusive - minInclusive + 1))
    );
  }

  chance(probability: number): boolean {
    if (probability < 0 || probability > 1 || !Number.isFinite(probability)) {
      throw new RangeError("Probability must be between zero and one");
    }

    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError("Cannot pick from an empty collection");
    }

    return items[this.int(0, items.length - 1)] as T;
  }

  fork(scope: string): SeededRng {
    return new SeededRng(`${this.#seedKey}:${scope}`);
  }
}
