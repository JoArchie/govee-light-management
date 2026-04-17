import { describe, it, expect } from "vitest";
import {
  SequenceStep,
  StepType,
} from "../../../src/backend/domain/value-objects/SequenceStep";

describe("SequenceStep", () => {
  describe("Action Step", () => {
    it("should create a basic action step", () => {
      const step = SequenceStep.action({
        targetId: "device-1",
        targetType: "light",
        command: "on",
      });
      expect(step.type).toBe(StepType.Action);
      expect(step.targetId).toBe("device-1");
      expect(step.command).toBe("on");
    });

    it("should support action with value", () => {
      const step = SequenceStep.action({
        targetId: "device-1",
        targetType: "light",
        command: "brightness",
        commandValue: 75,
      });
      expect(step.commandValue).toBe(75);
    });

    it("should support group targets", () => {
      const step = SequenceStep.action({
        targetId: "group-1",
        targetType: "group",
        command: "off",
      });
      expect(step.targetType).toBe("group");
    });

    it("should reject empty targetId", () => {
      expect(() =>
        SequenceStep.action({
          targetId: "",
          targetType: "light",
          command: "on",
        }),
      ).toThrow("Target ID cannot be empty");
    });
  });

  describe("Delay Step", () => {
    it("should create a delay step", () => {
      const step = SequenceStep.delay(2000);
      expect(step.type).toBe(StepType.Delay);
      expect(step.durationMs).toBe(2000);
    });

    it("should reject negative delays", () => {
      expect(() => SequenceStep.delay(-1)).toThrow(
        "Delay duration must be positive",
      );
    });

    it("should reject zero delays", () => {
      expect(() => SequenceStep.delay(0)).toThrow(
        "Delay duration must be positive",
      );
    });

    it("should accept max delay of 5 minutes", () => {
      const step = SequenceStep.delay(300_000);
      expect(step.durationMs).toBe(300_000);
    });

    it("should reject delays over 5 minutes", () => {
      expect(() => SequenceStep.delay(300_001)).toThrow(
        "Delay duration must be 5 minutes or less",
      );
    });
  });

  describe("Serialization", () => {
    it("should serialize action step", () => {
      const step = SequenceStep.action({
        targetId: "device-1",
        targetType: "light",
        command: "brightness",
        commandValue: 50,
      });
      const json = step.toJSON();
      expect(json.type).toBe("action");
      expect(json.targetId).toBe("device-1");
      expect(json.commandValue).toBe(50);
    });

    it("should serialize delay step", () => {
      const step = SequenceStep.delay(2000);
      const json = step.toJSON();
      expect(json.type).toBe("delay");
      expect(json.durationMs).toBe(2000);
    });

    it("should round-trip action step", () => {
      const original = SequenceStep.action({
        targetId: "device-1",
        targetType: "light",
        command: "color",
        commandValue: "#FF0000",
      });
      const restored = SequenceStep.fromJSON(original.toJSON());
      expect(restored.type).toBe(original.type);
      expect(restored.targetId).toBe(original.targetId);
      expect(restored.commandValue).toBe(original.commandValue);
    });

    it("should round-trip delay step", () => {
      const original = SequenceStep.delay(3000);
      const restored = SequenceStep.fromJSON(original.toJSON());
      expect(restored.type).toBe(original.type);
      expect(restored.durationMs).toBe(original.durationMs);
    });
  });
});
