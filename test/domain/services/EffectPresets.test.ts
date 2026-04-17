import { describe, it, expect } from "vitest";
import { EffectPresets } from "../../../src/backend/domain/services/EffectPresets";
import { LoopMode } from "../../../src/backend/domain/entities/RgbEffect";

describe("EffectPresets", () => {
  describe("getAll", () => {
    it("should return all available presets", () => {
      const presets = EffectPresets.getAll();
      expect(presets.length).toBeGreaterThanOrEqual(4);
    });

    it("should have unique ids", () => {
      const presets = EffectPresets.getAll();
      const ids = presets.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should have unique names", () => {
      const presets = EffectPresets.getAll();
      const names = presets.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("rainbowWave", () => {
    it("should create a rainbow wave effect", () => {
      const effect = EffectPresets.rainbowWave();
      expect(effect.name).toBe("Rainbow Wave");
      expect(effect.frames.length).toBeGreaterThan(1);
      expect(effect.loopMode).toBe(LoopMode.Loop);
    });

    it("should have varying colors across frames", () => {
      const effect = EffectPresets.rainbowWave();
      const firstColor = effect.frames[0].segmentColors[0];
      const middleColor =
        effect.frames[Math.floor(effect.frames.length / 2)].segmentColors[0];
      expect(firstColor).not.toBe(middleColor);
    });
  });

  describe("pulse", () => {
    it("should create a pulse effect with specified color", () => {
      const effect = EffectPresets.pulse("#FF0000");
      expect(effect.name).toBe("Pulse");
      expect(effect.frames.length).toBeGreaterThan(1);
    });

    it("should fade the color brightness", () => {
      const effect = EffectPresets.pulse("#FF0000");
      // First frame should be at full color
      expect(effect.frames[0].segmentColors[0]).toBe("#FF0000");
      // Middle frame should be dimmed
      const middle = effect.frames[Math.floor(effect.frames.length / 2)];
      expect(middle.segmentColors[0]).not.toBe("#FF0000");
    });
  });

  describe("fade", () => {
    it("should create a fade between two colors", () => {
      const effect = EffectPresets.fade("#FF0000", "#0000FF");
      expect(effect.name).toBe("Fade");
      expect(effect.frames.length).toBeGreaterThan(1);
    });

    it("should start with first color and end with second", () => {
      const effect = EffectPresets.fade("#FF0000", "#0000FF");
      expect(effect.frames[0].segmentColors[0]).toBe("#FF0000");
      expect(effect.frames[effect.frames.length - 1].segmentColors[0]).toBe(
        "#0000FF",
      );
    });
  });

  describe("strobe", () => {
    it("should alternate between on and off", () => {
      const effect = EffectPresets.strobe("#FFFFFF");
      expect(effect.name).toBe("Strobe");
      // Should have even number of frames (on/off pairs)
      expect(effect.frames.length % 2).toBe(0);
    });
  });
});
