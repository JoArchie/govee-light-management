import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SequenceExecutor } from "../../../src/backend/domain/services/SequenceExecutor";
import { Sequence } from "../../../src/backend/domain/entities/Sequence";
import { SequenceStep } from "../../../src/backend/domain/value-objects/SequenceStep";

function actionStep(id = "device-1", cmd: "on" | "off" = "on"): SequenceStep {
  return SequenceStep.action({
    targetId: id,
    targetType: "light",
    command: cmd,
  });
}

describe("SequenceExecutor", () => {
  let actionHandler: ReturnType<typeof vi.fn>;
  let executor: SequenceExecutor;

  beforeEach(() => {
    vi.useFakeTimers();
    actionHandler = vi.fn().mockResolvedValue(undefined);
    executor = new SequenceExecutor(actionHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Execution", () => {
    it("should execute empty sequence without error", async () => {
      const seq = Sequence.create({ id: "s1", name: "Empty" });
      await executor.execute(seq);
      expect(actionHandler).not.toHaveBeenCalled();
    });

    it("should execute a single action step", async () => {
      const seq = Sequence.create({
        id: "s1",
        name: "Single",
        steps: [actionStep()],
      });
      await executor.execute(seq);
      expect(actionHandler).toHaveBeenCalledTimes(1);
    });

    it("should execute steps in order", async () => {
      const seq = Sequence.create({
        id: "s1",
        name: "Ordered",
        steps: [
          actionStep("light-1", "on"),
          actionStep("light-2", "off"),
          actionStep("light-3", "on"),
        ],
      });
      await executor.execute(seq);
      expect(actionHandler).toHaveBeenCalledTimes(3);
      const calls = actionHandler.mock.calls.map((c) => c[0].targetId);
      expect(calls).toEqual(["light-1", "light-2", "light-3"]);
    });
  });

  describe("Delay Handling", () => {
    it("should wait between steps when delay is present", async () => {
      const seq = Sequence.create({
        id: "s1",
        name: "With delay",
        steps: [actionStep(), SequenceStep.delay(2000), actionStep()],
      });

      const promise = executor.execute(seq);

      // First action fires immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(actionHandler).toHaveBeenCalledTimes(1);

      // After 1 second, still waiting
      await vi.advanceTimersByTimeAsync(1000);
      expect(actionHandler).toHaveBeenCalledTimes(1);

      // After 2 seconds total, second action fires
      await vi.advanceTimersByTimeAsync(1000);
      expect(actionHandler).toHaveBeenCalledTimes(2);

      await promise;
    });

    it("should respect multiple delays", async () => {
      const seq = Sequence.create({
        id: "s1",
        name: "Multi delay",
        steps: [
          actionStep(),
          SequenceStep.delay(500),
          actionStep(),
          SequenceStep.delay(1000),
          actionStep(),
        ],
      });

      const promise = executor.execute(seq);
      await vi.runAllTimersAsync();
      await promise;

      expect(actionHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe("Cancellation", () => {
    it("should stop execution when cancelled", async () => {
      const seq = Sequence.create({
        id: "s1",
        name: "Cancellable",
        steps: [
          actionStep(),
          SequenceStep.delay(5000),
          actionStep(),
          actionStep(),
        ],
      });

      const promise = executor.execute(seq);
      await vi.advanceTimersByTimeAsync(100);
      executor.cancel(seq.id);
      await vi.runAllTimersAsync();
      await promise;

      expect(actionHandler).toHaveBeenCalledTimes(1);
    });

    it("should report running state", async () => {
      const seq = Sequence.create({
        id: "s1",
        name: "Running",
        steps: [actionStep(), SequenceStep.delay(5000), actionStep()],
      });

      expect(executor.isRunning(seq.id)).toBe(false);
      const promise = executor.execute(seq);
      await vi.advanceTimersByTimeAsync(100);
      expect(executor.isRunning(seq.id)).toBe(true);

      executor.cancel(seq.id);
      await vi.runAllTimersAsync();
      await promise;
      expect(executor.isRunning(seq.id)).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should continue after action error by default", async () => {
      let callCount = 0;
      const failingHandler = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error("First fails");
      });
      const customExecutor = new SequenceExecutor(failingHandler);

      const seq = Sequence.create({
        id: "s1",
        name: "Error",
        steps: [actionStep(), actionStep(), actionStep()],
      });

      await customExecutor.execute(seq);
      expect(failingHandler).toHaveBeenCalledTimes(3);
    });

    it("should stop on error when stopOnError is true", async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error("Fail"));
      const customExecutor = new SequenceExecutor(failingHandler, {
        stopOnError: true,
      });

      const seq = Sequence.create({
        id: "s1",
        name: "Stop on error",
        steps: [actionStep(), actionStep(), actionStep()],
      });

      await expect(customExecutor.execute(seq)).rejects.toThrow("Fail");
      expect(failingHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Concurrency", () => {
    it("should not run the same sequence twice simultaneously", async () => {
      const seq = Sequence.create({
        id: "s1",
        name: "Concurrent",
        steps: [actionStep(), SequenceStep.delay(5000), actionStep()],
      });

      const first = executor.execute(seq);
      await vi.advanceTimersByTimeAsync(100);

      // Second execute should be rejected
      await expect(executor.execute(seq)).rejects.toThrow(
        "Sequence 's1' is already running",
      );

      executor.cancel(seq.id);
      await vi.runAllTimersAsync();
      await first;
    });
  });
});
