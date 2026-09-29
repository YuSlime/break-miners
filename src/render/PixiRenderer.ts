import { Application, Container, Graphics } from "pixi.js";
import { BALANCE } from "../data/balance";
import type { EngineRenderState } from "../game/GameEngine";
import type { Vec2, VisualEvent } from "../game/gameTypes";
import { Camera } from "./Camera";
import { DisplayPool } from "./DisplayPools";
import {
  particleLimit,
  type RenderQualitySettings,
} from "./ParticleBudget";

export interface PixiRendererOptions {
  container: HTMLElement;
  resolutionCap: number;
  reducedMotion: boolean;
}

interface TimedEffect {
  display: Graphics;
  remainingFrames: number;
}

export class PixiRenderer {
  readonly #application: Application;
  readonly #world = new Container();
  readonly #effects = new Container();
  readonly #blocks = new Map<string, Graphics>();
  readonly #blockPool: DisplayPool<Graphics>;
  readonly #effectPool: DisplayPool<Graphics>;
  readonly #activeEffects: TimedEffect[] = [];
  readonly #player: Graphics;
  readonly #camera: Camera;
  #quality: RenderQualitySettings;
  #viewport = { width: 1, height: 1 };
  #previousPlayerPosition: Vec2 | undefined;

  private constructor(
    application: Application,
    options: PixiRendererOptions,
  ) {
    this.#application = application;
    this.#camera = new Camera({ maxShake: 14, reducedMotion: options.reducedMotion });
    this.#quality = {
      deviceClass: matchMedia("(pointer: coarse)").matches ? "MOBILE" : "DESKTOP",
      quality: "AUTO",
      reducedMotion: options.reducedMotion,
      screenFlash: true,
      cameraShakePercent: 100,
    };
    this.#blockPool = new DisplayPool(
      () => new Graphics(),
      (display) => {
        display.removeFromParent();
        display.clear();
        display.visible = true;
      },
    );
    this.#effectPool = new DisplayPool(
      () => new Graphics(),
      (display) => {
        display.removeFromParent();
        display.clear();
        display.alpha = 1;
        display.scale.set(1);
      },
    );
    this.#player = new Graphics().circle(0, 0, 11).fill(0xf4fbff);
    this.#player.circle(0, 0, 5).fill(0x4be8ff);
    this.#world.addChild(this.#effects, this.#player);
    this.#application.stage.addChild(this.#world);
  }

  static async create(options: PixiRendererOptions): Promise<PixiRenderer> {
    const application = new Application();
    await application.init({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, options.resolutionCap),
    });
    application.stop();
    application.canvas.className = "game-canvas";
    application.canvas.setAttribute("aria-label", "BREAK MINERS game field");
    application.canvas.setAttribute("role", "img");
    options.container.appendChild(application.canvas);
    return new PixiRenderer(application, options);
  }

  resize(
    widthCssPx: number,
    heightCssPx: number,
    devicePixelRatio: number,
  ): void {
    const width = Math.max(1, Math.floor(widthCssPx));
    const height = Math.max(1, Math.floor(heightCssPx));
    this.#viewport = { width, height };
    this.#application.renderer.resize(
      width,
      height,
      Math.min(devicePixelRatio || 1, 2),
    );
    this.#application.canvas.style.width = `${width}px`;
    this.#application.canvas.style.height = `${height}px`;
  }

  render(state: Readonly<EngineRenderState>, _alpha: number): void {
    const liveIds = new Set(state.blocks.map((block) => block.id));
    for (const [id, display] of this.#blocks) {
      if (!liveIds.has(id)) {
        this.#blocks.delete(id);
        this.#blockPool.release(display);
      }
    }

    for (const block of state.blocks) {
      let display = this.#blocks.get(block.id);
      if (!display) {
        display = this.#blockPool.acquire();
        display
          .roundRect(1, 1, BALANCE.tileSize - 2, BALANCE.tileSize - 2, 5)
          .fill(block.color);
        if (block.boss) {
          display
            .roundRect(2, 2, BALANCE.tileSize - 4, BALANCE.tileSize - 4, 4)
            .stroke({ color: 0xffffff, width: 2 });
        }
        this.#world.addChildAt(display, 0);
        this.#blocks.set(block.id, display);
      }
      display.position.set(
        block.tileX * BALANCE.tileSize,
        block.tileY * BALANCE.tileSize,
      );
      display.alpha = 0.65 + 0.35 * (block.currentHp / block.maxHp);
    }

    const playerPosition = state.player.position;
    const previous = this.#previousPlayerPosition ?? playerPosition;
    const velocity = {
      x: (playerPosition.x - previous.x) * BALANCE.simulationHz,
      y: (playerPosition.y - previous.y) * BALANCE.simulationHz,
    };
    this.#previousPlayerPosition = { ...playerPosition };
    this.#player.position.set(playerPosition.x, playerPosition.y);
    this.#camera.follow(playerPosition, velocity);
    const camera = this.#camera.getState();
    this.#world.pivot.set(camera.center.x, camera.center.y);
    this.#world.position.set(
      this.#viewport.width / 2 + camera.shakeAmplitude * 0.35,
      this.#viewport.height / 2 - camera.shakeAmplitude * 0.2,
    );
    this.#camera.decayShake();

    for (let index = this.#activeEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.#activeEffects[index]!;
      effect.remainingFrames -= 1;
      effect.display.alpha = Math.max(0, effect.remainingFrames / 18);
      effect.display.scale.set(1 + (18 - effect.remainingFrames) * 0.05);
      if (effect.remainingFrames <= 0) {
        this.#activeEffects.splice(index, 1);
        this.#effectPool.release(effect.display);
      }
    }

    this.#application.renderer.render(this.#application.stage);
  }

  consumeVisualEvents(events: readonly VisualEvent[]): void {
    const limit = particleLimit(this.#quality);
    for (const event of events) {
      if (this.#activeEffects.length >= limit) break;
      if (event.type === "BLOCK_HIT") {
        this.#spawnRing(event.position, event.critical ? 0xffd35a : 0xffffff, 7);
      } else if (event.type === "BLOCK_BREAK") {
        this.#spawnRing(event.position, event.color, 14);
      } else if (event.type === "EXPLOSION") {
        this.#spawnRing(event.position, 0xff773d, event.radius);
        this.#camera.requestShake(5 * (this.#quality.cameraShakePercent / 100));
      } else if (event.type === "CORE_GATE_DESTROYED") {
        this.#spawnRing(event.position, 0xffd35a, 42);
        this.#camera.requestShake(12 * (this.#quality.cameraShakePercent / 100));
      } else if (event.type === "BREAK_TIME_START") {
        this.#camera.requestShake(8 * (this.#quality.cameraShakePercent / 100));
      }
    }
  }

  setQuality(settings: RenderQualitySettings): void {
    this.#quality = { ...settings };
    this.#camera.setReducedMotion(settings.reducedMotion);
  }

  destroy(): void {
    this.#blocks.clear();
    this.#activeEffects.length = 0;
    this.#blockPool.clear((display) => display.destroy());
    this.#effectPool.clear((display) => display.destroy());
    this.#application.destroy({ removeView: true }, { children: true });
  }

  #spawnRing(position: Vec2, color: number, radius: number): void {
    const display = this.#effectPool.acquire();
    display.circle(0, 0, radius).stroke({ color, width: 3 });
    display.position.set(position.x, position.y);
    this.#effects.addChild(display);
    this.#activeEffects.push({ display, remainingFrames: 18 });
  }
}
