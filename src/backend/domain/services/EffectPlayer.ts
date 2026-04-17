import { LoopMode, RgbEffect } from "../entities/RgbEffect";
import { EffectFrame } from "../value-objects/EffectFrame";

export type EffectFrameHandler = (
  targetId: string,
  frame: EffectFrame,
) => Promise<void>;

interface PlaybackState {
  cancelled: boolean;
  currentTimer?: NodeJS.Timeout;
  resolveDelay?: () => void;
}

/**
 * Plays RGB effects on target lights frame-by-frame.
 * Supports concurrent playback on different targets.
 * Handles Once and Loop modes with cancellation support.
 */
export class EffectPlayer {
  private playing = new Map<string, PlaybackState>();

  constructor(private readonly frameHandler: EffectFrameHandler) {}

  /**
   * Play an effect on a target. Cancels any existing playback on that target first.
   */
  async play(targetId: string, effect: RgbEffect): Promise<void> {
    // Cancel any existing playback on this target
    this.cancel(targetId);

    const state: PlaybackState = { cancelled: false };
    this.playing.set(targetId, state);

    try {
      do {
        await this.playOnce(targetId, effect, state);
      } while (!state.cancelled && effect.loopMode === LoopMode.Loop);
    } finally {
      this.playing.delete(targetId);
    }
  }

  /**
   * Cancel playback on a specific target.
   */
  cancel(targetId: string): boolean {
    const state = this.playing.get(targetId);
    if (!state) return false;

    state.cancelled = true;
    if (state.currentTimer) {
      clearTimeout(state.currentTimer);
      state.currentTimer = undefined;
    }
    if (state.resolveDelay) {
      state.resolveDelay();
      state.resolveDelay = undefined;
    }
    return true;
  }

  isPlaying(targetId: string): boolean {
    return this.playing.has(targetId);
  }

  /**
   * Play one iteration of the effect.
   */
  private async playOnce(
    targetId: string,
    effect: RgbEffect,
    state: PlaybackState,
  ): Promise<void> {
    let previousTiming = 0;
    for (const frame of effect.frames) {
      if (state.cancelled) return;

      const waitMs = frame.timingMs - previousTiming;
      if (waitMs > 0) {
        await this.waitFor(state, waitMs);
      }
      if (state.cancelled) return;

      await this.dispatchFrame(targetId, frame);
      previousTiming = frame.timingMs;
    }
  }

  private async dispatchFrame(
    targetId: string,
    frame: EffectFrame,
  ): Promise<void> {
    try {
      await this.frameHandler(targetId, frame);
    } catch {
      // Swallow frame errors — continue animation
    }
  }

  private waitFor(state: PlaybackState, ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (state.cancelled) {
        resolve();
        return;
      }
      state.resolveDelay = resolve;
      state.currentTimer = setTimeout(() => {
        state.currentTimer = undefined;
        state.resolveDelay = undefined;
        resolve();
      }, ms);
    });
  }
}
