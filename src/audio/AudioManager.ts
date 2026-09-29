export type AudioEventType =
  | "MINE"
  | "BLOCK_BREAK"
  | "EXPLOSION"
  | "LIGHTNING"
  | "RARE_DROP"
  | "BREAK_TIME_START"
  | "CORE_GATE";

export interface AudioEvent {
  type: AudioEventType;
  combo?: number;
}

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export interface AudioPlaybackAdapter {
  play(
    type: AudioEventType,
    options: { volume: number; pitch: number },
  ): void | Promise<void>;
}

const SILENT_ADAPTER: AudioPlaybackAdapter = { play: () => undefined };

export class AudioManager {
  readonly #adapter: AudioPlaybackAdapter;
  #settings: AudioSettings = { masterVolume: 1, musicVolume: 0.7, sfxVolume: 0.8 };
  #musicState: "NORMAL" | "BREAK_TIME" | "BOSS" = "NORMAL";
  #destroyed = false;

  constructor(adapter: AudioPlaybackAdapter = SILENT_ADAPTER) {
    this.#adapter = adapter;
  }

  async play(event: AudioEvent): Promise<void> {
    if (this.#destroyed) return;
    const pitch = Math.max(0.75, Math.min(1.5, 1 + (event.combo ?? 0) * 0.01));
    const volume = Math.max(
      0,
      Math.min(1, this.#settings.masterVolume * this.#settings.sfxVolume),
    );
    try {
      await this.#adapter.play(event.type, { volume, pitch });
    } catch {
      // Audio is presentational and must never affect simulation state.
    }
  }

  setSettings(settings: AudioSettings): void {
    this.#settings = {
      masterVolume: Math.max(0, Math.min(1, settings.masterVolume)),
      musicVolume: Math.max(0, Math.min(1, settings.musicVolume)),
      sfxVolume: Math.max(0, Math.min(1, settings.sfxVolume)),
    };
  }

  setMusicState(state: "NORMAL" | "BREAK_TIME" | "BOSS"): void {
    this.#musicState = state;
  }

  getMusicState(): "NORMAL" | "BREAK_TIME" | "BOSS" {
    return this.#musicState;
  }

  destroy(): void {
    this.#destroyed = true;
  }
}
