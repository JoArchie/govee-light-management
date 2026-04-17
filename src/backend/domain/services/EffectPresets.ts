import { LoopMode, RgbEffect } from "../entities/RgbEffect";
import { EffectFrame } from "../value-objects/EffectFrame";

/**
 * Static factory service for built-in RGB effect presets.
 * Each preset generates a complete RgbEffect with frames and appropriate loop mode.
 */
export class EffectPresets {
  /**
   * All available preset effects.
   */
  static getAll(): RgbEffect[] {
    return [
      EffectPresets.rainbowWave(),
      EffectPresets.pulse("#FF0000"),
      EffectPresets.fade("#FF0000", "#0000FF"),
      EffectPresets.strobe("#FFFFFF"),
    ];
  }

  /**
   * Rainbow wave — hue rotates across segments, looping continuously.
   */
  static rainbowWave(): RgbEffect {
    const frameCount = 36; // 10° per frame = 360° full cycle
    const durationPerFrame = 100; // 100ms per frame = 3.6s loop
    const frames = Array.from({ length: frameCount }, (_, i) =>
      EffectFrame.rainbow(i * durationPerFrame, i * 10),
    );
    return RgbEffect.create({
      id: "preset-rainbow-wave",
      name: "Rainbow Wave",
      frames,
      loopMode: LoopMode.Loop,
    });
  }

  /**
   * Pulse — color fades in and out.
   */
  static pulse(hex: string): RgbEffect {
    const steps = 10;
    const stepDuration = 100;
    const frames: EffectFrame[] = [];

    // Fade out from full brightness
    for (let i = 0; i < steps; i++) {
      const dimFactor = 1 - i / (steps - 1);
      frames.push(
        EffectFrame.uniform(
          i * stepDuration,
          EffectPresets.dim(hex, dimFactor),
        ),
      );
    }

    // Fade back in
    for (let i = 1; i < steps; i++) {
      const dimFactor = i / (steps - 1);
      frames.push(
        EffectFrame.uniform(
          (steps + i - 1) * stepDuration,
          EffectPresets.dim(hex, dimFactor),
        ),
      );
    }

    return RgbEffect.create({
      id: "preset-pulse",
      name: "Pulse",
      frames,
      loopMode: LoopMode.Loop,
    });
  }

  /**
   * Fade — smoothly transitions from startHex to endHex.
   */
  static fade(startHex: string, endHex: string): RgbEffect {
    const steps = 20;
    const stepDuration = 100;
    const start = EffectPresets.hexToRgb(startHex);
    const end = EffectPresets.hexToRgb(endHex);

    const frames = Array.from({ length: steps }, (_, i) => {
      const t = i / (steps - 1);
      const r = Math.round(start.r + (end.r - start.r) * t);
      const g = Math.round(start.g + (end.g - start.g) * t);
      const b = Math.round(start.b + (end.b - start.b) * t);
      return EffectFrame.uniform(
        i * stepDuration,
        EffectPresets.rgbToHex(r, g, b),
      );
    });

    return RgbEffect.create({
      id: "preset-fade",
      name: "Fade",
      frames,
      loopMode: LoopMode.Loop,
    });
  }

  /**
   * Strobe — rapidly alternates between color and black.
   */
  static strobe(hex: string): RgbEffect {
    const flashCount = 10;
    const flashDuration = 100;
    const frames: EffectFrame[] = [];
    for (let i = 0; i < flashCount; i++) {
      frames.push(EffectFrame.uniform(i * 2 * flashDuration, hex));
      frames.push(
        EffectFrame.uniform(i * 2 * flashDuration + flashDuration, "#000000"),
      );
    }
    return RgbEffect.create({
      id: "preset-strobe",
      name: "Strobe",
      frames,
      loopMode: LoopMode.Loop,
    });
  }

  // ─── Color Helpers ───────────────────────────────────────

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return (
      "#" +
      [r, g, b]
        .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }

  private static dim(hex: string, factor: number): string {
    const rgb = EffectPresets.hexToRgb(hex);
    return EffectPresets.rgbToHex(
      Math.round(rgb.r * factor),
      Math.round(rgb.g * factor),
      Math.round(rgb.b * factor),
    );
  }
}
