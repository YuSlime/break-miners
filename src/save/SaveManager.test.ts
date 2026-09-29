import { createDefaultSave } from "./SaveSchema";
import { SaveManager, type StorageLike } from "./SaveManager";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("SaveManager", () => {
  it("loads primary, then valid backup, then a safe default", () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    storage.setItem("break_miners_save", JSON.stringify({ ...createDefaultSave(), credits: 9 }));
    expect(manager.load()).toMatchObject({ source: "PRIMARY", data: { credits: 9 } });

    storage.setItem("break_miners_save", "not json");
    storage.setItem("break_miners_save_backup", JSON.stringify({ ...createDefaultSave(), credits: 7 }));
    expect(manager.load()).toMatchObject({ source: "BACKUP", data: { credits: 7 } });

    storage.setItem("break_miners_save_backup", "also broken");
    expect(manager.load()).toMatchObject({ source: "DEFAULT", data: { credits: 0 } });
  });

  it("backs up the previous valid primary before writing", () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    const first = { ...createDefaultSave(), credits: 4 };
    const second = { ...createDefaultSave(), credits: 11 };
    expect(manager.save(first).ok).toBe(true);
    expect(manager.save(second).ok).toBe(true);
    expect(JSON.parse(storage.getItem("break_miners_save_backup")!)).toMatchObject({ credits: 4 });
    expect(JSON.parse(storage.getItem("break_miners_save")!)).toMatchObject({ credits: 11 });
  });

  it("contains storage exceptions and retains in-memory session state", () => {
    const storage: StorageLike = {
      getItem: () => { throw new DOMException("blocked", "SecurityError"); },
      setItem: () => { throw new DOMException("full", "QuotaExceededError"); },
    };
    const manager = new SaveManager(storage);
    const data = { ...createDefaultSave(), credits: 15 };
    expect(manager.save(data)).toMatchObject({ ok: false, data: { credits: 15 } });
    expect(manager.load()).toMatchObject({ source: "MEMORY", data: { credits: 15 } });
  });
});
