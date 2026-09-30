import { AudioManager, type AudioPlaybackAdapter } from "./AudioManager";

describe("AudioManager", () => {
  it("routes semantic events through channel volume and clamps combo pitch", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const adapter: AudioPlaybackAdapter = { play };
    const audio = new AudioManager(adapter);
    audio.setSettings({ masterVolume: 0.5, musicVolume: 0.4, sfxVolume: 0.8 });

    for (const type of ["MINE", "BLOCK_BREAK", "EXPLOSION", "LIGHTNING", "RARE_DROP", "BREAK_TIME_START", "CORE_GATE"] as const) {
      await audio.play({ type, combo: 999 });
    }

    expect(play).toHaveBeenCalledTimes(7);
    expect(play.mock.calls[0]![1]).toMatchObject({ volume: 0.4, pitch: 1.5 });
  });

  it("contains rejected playback and keeps music state transitions", async () => {
    const audio = new AudioManager({ play: vi.fn().mockRejectedValue(new Error("no audio")) });
    audio.setMusicState("BREAK_TIME");
    await expect(audio.play({ type: "EXPLOSION" })).resolves.toBeUndefined();
    expect(audio.getMusicState()).toBe("BREAK_TIME");
    audio.destroy();
    await expect(audio.play({ type: "MINE" })).resolves.toBeUndefined();
  });
});
