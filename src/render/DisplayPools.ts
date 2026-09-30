export class DisplayPool<T> {
  readonly #create: () => T;
  readonly #reset: (item: T) => void;
  readonly #available: T[] = [];

  constructor(create: () => T, reset: (item: T) => void) {
    this.#create = create;
    this.#reset = reset;
  }

  acquire(): T {
    return this.#available.pop() ?? this.#create();
  }

  release(item: T): void {
    this.#reset(item);
    this.#available.push(item);
  }

  clear(destroy?: (item: T) => void): void {
    if (destroy) this.#available.forEach(destroy);
    this.#available.length = 0;
  }
}
