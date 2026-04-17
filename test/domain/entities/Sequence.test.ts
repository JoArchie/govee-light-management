import { describe, it, expect } from "vitest";
import { Sequence } from "../../../src/backend/domain/entities/Sequence";
import { SequenceStep } from "../../../src/backend/domain/value-objects/SequenceStep";

function actionStep(command: "on" | "off" = "on"): SequenceStep {
  return SequenceStep.action({
    targetId: "device-1",
    targetType: "light",
    command,
  });
}

describe("Sequence", () => {
  describe("Creation", () => {
    it("should create an empty sequence", () => {
      const seq = Sequence.create({ id: "seq-1", name: "Test" });
      expect(seq.id).toBe("seq-1");
      expect(seq.name).toBe("Test");
      expect(seq.steps).toHaveLength(0);
    });

    it("should create sequence with initial steps", () => {
      const steps = [actionStep("on"), SequenceStep.delay(1000), actionStep("off")];
      const seq = Sequence.create({ id: "seq-1", name: "Test", steps });
      expect(seq.steps).toHaveLength(3);
    });

    it("should reject empty id", () => {
      expect(() => Sequence.create({ id: "", name: "Test" })).toThrow(
        "ID cannot be empty",
      );
    });

    it("should reject empty name", () => {
      expect(() => Sequence.create({ id: "seq-1", name: "" })).toThrow(
        "Name cannot be empty",
      );
    });
  });

  describe("Steps Management", () => {
    it("should add step to end", () => {
      const seq = Sequence.create({ id: "seq-1", name: "Test" });
      const updated = seq.addStep(actionStep("on"));
      expect(updated.steps).toHaveLength(1);
      expect(seq.steps).toHaveLength(0); // immutable
    });

    it("should remove step by index", () => {
      const steps = [actionStep("on"), SequenceStep.delay(1000), actionStep("off")];
      const seq = Sequence.create({ id: "seq-1", name: "Test", steps });
      const updated = seq.removeStep(1);
      expect(updated.steps).toHaveLength(2);
      expect(updated.steps[0].type).toBe("action");
      expect(updated.steps[1].type).toBe("action");
    });

    it("should reject out-of-bounds removal", () => {
      const seq = Sequence.create({ id: "seq-1", name: "Test" });
      expect(() => seq.removeStep(0)).toThrow("Index out of bounds");
    });

    it("should move step up", () => {
      const a = actionStep("on");
      const b = SequenceStep.delay(500);
      const c = actionStep("off");
      const seq = Sequence.create({
        id: "seq-1",
        name: "Test",
        steps: [a, b, c],
      });
      const updated = seq.moveStep(2, 0);
      expect(updated.steps[0].type).toBe("action"); // c
      expect(updated.steps[0].command).toBe("off");
    });

    it("should clear all steps", () => {
      const seq = Sequence.create({
        id: "seq-1",
        name: "Test",
        steps: [actionStep(), SequenceStep.delay(500)],
      });
      const cleared = seq.clearSteps();
      expect(cleared.steps).toHaveLength(0);
    });
  });

  describe("Duration Calculation", () => {
    it("should return 0 for empty sequence", () => {
      const seq = Sequence.create({ id: "seq-1", name: "Test" });
      expect(seq.estimatedDurationMs()).toBe(0);
    });

    it("should sum delay durations", () => {
      const seq = Sequence.create({
        id: "seq-1",
        name: "Test",
        steps: [
          SequenceStep.delay(1000),
          actionStep(),
          SequenceStep.delay(2000),
        ],
      });
      // 1000 + 2000 = 3000 (actions don't contribute to estimated delay)
      expect(seq.estimatedDurationMs()).toBe(3000);
    });
  });

  describe("Rename", () => {
    it("should create sequence with new name", () => {
      const seq = Sequence.create({ id: "seq-1", name: "Old Name" });
      const renamed = seq.rename("New Name");
      expect(renamed.name).toBe("New Name");
      expect(seq.name).toBe("Old Name"); // immutable
    });

    it("should reject empty rename", () => {
      const seq = Sequence.create({ id: "seq-1", name: "Test" });
      expect(() => seq.rename("")).toThrow("Name cannot be empty");
    });
  });

  describe("Serialization", () => {
    it("should serialize to JSON", () => {
      const seq = Sequence.create({
        id: "seq-1",
        name: "Test",
        steps: [actionStep("on"), SequenceStep.delay(1000)],
      });
      const json = seq.toJSON();
      expect(json.id).toBe("seq-1");
      expect(json.name).toBe("Test");
      expect(json.steps).toHaveLength(2);
    });

    it("should round-trip JSON", () => {
      const original = Sequence.create({
        id: "seq-1",
        name: "Test",
        steps: [actionStep("on"), SequenceStep.delay(1000), actionStep("off")],
      });
      const restored = Sequence.fromJSON(original.toJSON());
      expect(restored.id).toBe(original.id);
      expect(restored.steps).toHaveLength(3);
      expect(restored.estimatedDurationMs()).toBe(
        original.estimatedDurationMs(),
      );
    });
  });
});
