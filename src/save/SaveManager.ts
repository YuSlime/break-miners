import { migrateSave } from "./Migration";
import { createDefaultSave } from "./SaveSchema";
import type { SaveData } from "./saveTypes";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SaveLoadResult {
  source: "PRIMARY" | "BACKUP" | "MEMORY" | "DEFAULT";
  data: SaveData;
  warning?: string;
}

export interface SaveWriteResult {
  ok: boolean;
  data: SaveData;
  error?: string;
}

export class SaveManager {
  readonly #storage: StorageLike;
  readonly #primaryKey: string;
  readonly #backupKey: string;
  #memory: SaveData | undefined;
  #hasSessionWrite = false;

  constructor(
    storage: StorageLike,
    primaryKey = "break_miners_save",
    backupKey = "break_miners_save_backup",
  ) {
    this.#storage = storage;
    this.#primaryKey = primaryKey;
    this.#backupKey = backupKey;
  }

  load(): SaveLoadResult {
    try {
      const primary = this.#read(this.#primaryKey);
      if (primary) {
        this.#memory = structuredClone(primary);
        return { source: "PRIMARY", data: structuredClone(primary) };
      }
      const backup = this.#read(this.#backupKey);
      if (backup) {
        this.#memory = structuredClone(backup);
        return { source: "BACKUP", data: structuredClone(backup), warning: "PRIMARY_RECOVERED" };
      }
    } catch (error) {
      if (this.#memory && this.#hasSessionWrite) {
        return { source: "MEMORY", data: structuredClone(this.#memory), warning: String(error) };
      }
      return { source: "DEFAULT", data: createDefaultSave(), warning: String(error) };
    }
    if (this.#memory && this.#hasSessionWrite) {
      return { source: "MEMORY", data: structuredClone(this.#memory) };
    }
    return { source: "DEFAULT", data: createDefaultSave() };
  }

  save(data: Readonly<SaveData>): SaveWriteResult {
    const normalized = migrateSave(data).data;
    this.#memory = structuredClone(normalized);
    this.#hasSessionWrite = true;
    try {
      const previous = this.#readRawValid(this.#primaryKey);
      if (previous !== null) this.#storage.setItem(this.#backupKey, previous);
      this.#storage.setItem(this.#primaryKey, JSON.stringify(normalized));
      return { ok: true, data: structuredClone(normalized) };
    } catch (error) {
      return { ok: false, data: structuredClone(normalized), error: String(error) };
    }
  }

  #read(key: string): SaveData | undefined {
    const raw = this.#storage.getItem(key);
    if (raw === null) return undefined;
    try {
      const parsed = migrateSave(JSON.parse(raw));
      return parsed.valid ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }

  #readRawValid(key: string): string | null {
    const raw = this.#storage.getItem(key);
    if (raw === null) return null;
    try {
      return migrateSave(JSON.parse(raw)).valid ? raw : null;
    } catch {
      return null;
    }
  }
}
