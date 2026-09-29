import { Camera } from "./Camera";
import { DisplayPool } from "./DisplayPools";
import { particleLimit } from "./ParticleBudget";

describe("Camera", () => {
  it("looks ahead in the direction of movement", () => {
    const camera = new Camera({ maxShake: 12, reducedMotion: false });

    camera.follow({ x: 100, y: 200 }, { x: 120, y: 0 });

    expect(camera.getState().center.x).toBeGreaterThan(100);
    expect(camera.getState().center.y).toBe(200);
  });

  it("clamps accumulated shake and disables it for reduced motion", () => {
    const camera = new Camera({ maxShake: 12, reducedMotion: false });
    camera.requestShake(8);
    camera.requestShake(8);
    camera.requestShake(8);
    expect(camera.getState().shakeAmplitude).toBe(12);

    camera.setReducedMotion(true);
    camera.requestShake(12);
    expect(camera.getState().shakeAmplitude).toBe(0);
  });
});

describe("particleLimit", () => {
  it("caps low-quality mobile visuals at 300 particles", () => {
    expect(particleLimit({ deviceClass: "MOBILE", quality: "LOW" })).toBe(300);
  });

  it("caps high-quality desktop visuals at 2000 particles", () => {
    expect(particleLimit({ deviceClass: "DESKTOP", quality: "HIGH" })).toBe(2000);
  });
});

describe("DisplayPool", () => {
  it("reuses a released display object after resetting it", () => {
    const reset = vi.fn();
    const pool = new DisplayPool(() => ({ value: 0 }), reset);
    const first = pool.acquire();
    first.value = 42;
    pool.release(first);

    const reused = pool.acquire();

    expect(reused).toBe(first);
    expect(reset).toHaveBeenCalledWith(first);
  });
});
