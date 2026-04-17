import { describe, it, expect } from "vitest";
import { RgbEffect, LoopMode } from "../../../src/backend/domain/entities/RgbEffect";
import { EffectFrame } from "../../../src/backend/domain/value-objects/EffectFrame";

function createFrames(count: number, step = 100): EffectFrame[] {
  return Array.from({ length: count }, (_, i) =>
    EffectFrame.uniform(i * step, "#FF0000"),
  );
}

describe("RgbEffect", () => {
  describe("Creation", () => {
    it("should create effect with frames", () => {
      const effect = RgbEffect.create({
        id: "e1",
        name: "Test",
        frames: createFrames(3),
      });
      expect(effect.id).toBe("e1");
      expect(effect.name).toBe("Test");
      expect(effect.frames).toHaveLength(3);
    });

    it("should default to Once loop mode", () => {
      const effect = RgbEffect.create({
        id: "e1",
        name: "Test",
        frames: createFrames(1),
      });
      expect(effect.loopMode).toBe(LoopMode.Once);
    });

    it("should accept Loop mode", () => {
      const effect = RgbEffect.create({
        id: "e1",
        name: "Test",
        frames: createFrames(1),
        loopMode: LoopMode.Loop,
      });
      expect(effect.loopMode).toBe(LoopMode.Loop);
    });

    it("should reject empty id", () => {
      expect(() =>
        RgbEffect.create({ id: "", name: "Test", frames: createFrames(1) }),
      ).toThrow("ID cannot be empty");
    });

    it("should reject empty name", () => {
      expect(() =>
        RgbEffect.create({ id: "e1", name: "", frames: createFrames(1) }),
      ).toThrow("Name cannot be empty");
    });

    it("should reject empty frames", () => {
      expect(() =>
        RgbEffect.create({ id: "e1", name: "Test", frames: [] }),
      ).toThrow("Effect must have at least one frame");
    });

    it("should reject frames not in chronological order", () => {
      const out = [
        EffectFrame.uniform(100, "#FF0000"),
        EffectFrame.uniform(50, "#00FF00"),
      ];
      expect(() =>
        RgbEffect.create({ id: "e1", name: "Test", frames: out }),
      ).toThrow("Frames must be in chronological order");
    });
  });

  describe("Duration", () => {
    it("should calculate total duration", () => {
      const frames = [
        EffectFrame.uniform(0, "#FF0000"),
        EffectFrame.uniform(500, "#00FF00"),
        EffectFrame.uniform(1000, "#0000FF"),
      ];
      const effect = RgbEffect.create({ id: "e1", name: "Test", frames });
      expect(effect.durationMs).toBe(1000);
    });
  });

  describe("Serialization", () => {
    it("should round-trip JSON", () => {
      const original = RgbEffect.create({
        id: "e1",
        name: "Rainbow",
        frames: createFrames(3),
        loopMode: LoopMode.Loop,
      });
      const restored = RgbEffect.fromJSON(original.toJSON());
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.loopMode).toBe(original.loopMode);
      expect(restored.frames).toHaveLength(3);
    });
  });
});
