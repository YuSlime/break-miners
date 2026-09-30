import { BALANCE } from "../data/balance";
import { BLOCK_DEFINITIONS } from "../data/blocks";
import type { BlockState } from "../world/worldTypes";

export type BreakEventName =
  | "BLOCK_DESTROYED"
  | "XP_AWARDED"
  | "RUN_COINS_AWARDED"
  | "COMBO_UPDATED"
  | "BREAK_GAUGE_UPDATED"
  | "ON_BREAK_ENQUEUED"
  | "LOOT_ROLLED"
  | "VISUAL_EVENT_EMITTED";

export interface BreakRequest {
  block: Readonly<BlockState>;
  chainDepth: number;
}

export interface BreakContext {
  emit(event: BreakEventName, request: BreakRequest): void;
}

export interface BreakTickResult {
  processed: number;
  pending: number;
  xpAwarded: number;
  runCoinsAwarded: number;
  breakGaugeAwarded: number;
  rewardedBlockIds: readonly string[];
}

function gaugeFor(block: Readonly<BlockState>): number {
  if (block.type === "GEODE") return 5;
  if (block.type === "GOLD") return 3;
  if (BLOCK_DEFINITIONS[block.type].rarity === "RARE") return 2;
  return 1;
}

export class BreakPipeline {
  readonly #queue: BreakRequest[] = [];
  readonly #queuedIds = new Set<string>();
  readonly #rewardedIds = new Set<string>();

  enqueue(request: BreakRequest): void {
    if (
      request.chainDepth > BALANCE.maxChainDepth ||
      this.#queue.length >= BALANCE.maxPendingGameplayEvents ||
      this.#queuedIds.has(request.block.id) ||
      this.#rewardedIds.has(request.block.id)
    ) {
      return;
    }
    this.#queue.push(request);
    this.#queuedIds.add(request.block.id);
  }

  processTick(context: BreakContext): BreakTickResult {
    let processed = 0;
    let xpAwarded = 0;
    let runCoinsAwarded = 0;
    let breakGaugeAwarded = 0;
    const rewardedBlockIds: string[] = [];
    const eventOrder: readonly BreakEventName[] = [
      "BLOCK_DESTROYED",
      "XP_AWARDED",
      "RUN_COINS_AWARDED",
      "COMBO_UPDATED",
      "BREAK_GAUGE_UPDATED",
      "ON_BREAK_ENQUEUED",
      "LOOT_ROLLED",
      "VISUAL_EVENT_EMITTED",
    ];

    while (processed < BALANCE.maxBreaksPerTick && this.#queue.length > 0) {
      const request = this.#queue.shift()!;
      this.#queuedIds.delete(request.block.id);
      if (this.#rewardedIds.has(request.block.id)) continue;
      this.#rewardedIds.add(request.block.id);
      rewardedBlockIds.push(request.block.id);
      const definition = BLOCK_DEFINITIONS[request.block.type];
      xpAwarded += definition.xp;
      runCoinsAwarded += Math.max(1, Math.round(definition.rewardMultiplier));
      breakGaugeAwarded += gaugeFor(request.block);
      eventOrder.forEach((event) => context.emit(event, request));
      processed += 1;
    }

    return {
      processed,
      pending: this.#queue.length,
      xpAwarded,
      runCoinsAwarded,
      breakGaugeAwarded,
      rewardedBlockIds,
    };
  }

  clear(): void {
    this.#queue.length = 0;
    this.#queuedIds.clear();
    this.#rewardedIds.clear();
  }
}
