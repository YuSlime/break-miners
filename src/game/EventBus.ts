export type EventMap = Record<string, unknown>;

export class EventBus<TEvents extends EventMap> {
  readonly #listeners = new Map<
    keyof TEvents,
    Set<(payload: TEvents[keyof TEvents]) => void>
  >();

  on<TKey extends keyof TEvents>(
    type: TKey,
    listener: (payload: TEvents[TKey]) => void,
  ): () => void {
    const listeners = this.#listeners.get(type) ?? new Set();
    listeners.add(listener as (payload: TEvents[keyof TEvents]) => void);
    this.#listeners.set(type, listeners);

    return () => {
      listeners.delete(listener as (payload: TEvents[keyof TEvents]) => void);
    };
  }

  emit<TKey extends keyof TEvents>(type: TKey, payload: TEvents[TKey]): void {
    this.#listeners.get(type)?.forEach((listener) => listener(payload));
  }

  clear(): void {
    this.#listeners.clear();
  }
}
