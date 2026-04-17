import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SchedulerEngine } from "../../src/backend/infrastructure/SchedulerEngine";
import { ScheduleService } from "../../src/backend/domain/services/ScheduleService";
import { ScheduledAction } from "../../src/backend/domain/entities/ScheduledAction";
import { Schedule } from "../../src/backend/domain/value-objects/Schedule";

describe("SchedulerEngine", () => {
  let service: ScheduleService;
  let engine: SchedulerEngine;
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T10:00:00Z"));
    service = new ScheduleService();
    handler = vi.fn().mockResolvedValue(undefined);
    engine = new SchedulerEngine(service, handler, { pollIntervalMs: 1000 });
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
  });

  describe("Lifecycle", () => {
    it("should start in stopped state", () => {
      expect(engine.isRunning()).toBe(false);
    });

    it("should transition to running when started", () => {
      engine.start();
      expect(engine.isRunning()).toBe(true);
    });

    it("should stop cleanly", () => {
      engine.start();
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it("should be idempotent on start", () => {
      engine.start();
      engine.start();
      expect(engine.isRunning()).toBe(true);
    });
  });

  describe("Trigger Firing", () => {
    it("should fire handler when action becomes due", async () => {
      const futureDate = new Date(Date.now() + 5_000);
      const action = ScheduledAction.create({
        id: "a1",
        name: "Test",
        schedule: Schedule.oneTime(futureDate),
        targetId: "device-1",
        targetType: "light",
        command: "on",
      });
      service.register(action);
      engine.start();

      // Not fired yet
      await vi.advanceTimersByTimeAsync(1_000);
      expect(handler).not.toHaveBeenCalled();

      // Advance past trigger
      await vi.advanceTimersByTimeAsync(5_000);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(action);
    });

    it("should not fire disabled actions", async () => {
      const futureDate = new Date(Date.now() + 5_000);
      const disabled = ScheduledAction.create({
        id: "a1",
        name: "Test",
        schedule: Schedule.oneTime(futureDate).disable(),
        targetId: "device-1",
        targetType: "light",
        command: "on",
      });
      service.register(disabled);
      engine.start();

      await vi.advanceTimersByTimeAsync(10_000);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should fire multiple actions in same tick", async () => {
      const future = new Date(Date.now() + 2_000);
      service.register(
        ScheduledAction.create({
          id: "a1",
          name: "A1",
          schedule: Schedule.oneTime(future),
          targetId: "device-1",
          targetType: "light",
          command: "on",
        }),
      );
      service.register(
        ScheduledAction.create({
          id: "a2",
          name: "A2",
          schedule: Schedule.oneTime(new Date(future.getTime() + 500)),
          targetId: "device-2",
          targetType: "light",
          command: "off",
        }),
      );

      engine.start();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should mark one-time actions as fired after execution", async () => {
      const futureDate = new Date(Date.now() + 2_000);
      const action = ScheduledAction.create({
        id: "a1",
        name: "Test",
        schedule: Schedule.oneTime(futureDate),
        targetId: "device-1",
        targetType: "light",
        command: "on",
      });
      service.register(action);
      engine.start();

      await vi.advanceTimersByTimeAsync(5_000);
      expect(handler).toHaveBeenCalledTimes(1);

      // Should not fire again
      await vi.advanceTimersByTimeAsync(10_000);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should handle handler errors gracefully", async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error("fail"));
      const errorEngine = new SchedulerEngine(service, errorHandler, {
        pollIntervalMs: 1000,
      });

      const futureDate = new Date(Date.now() + 2_000);
      service.register(
        ScheduledAction.create({
          id: "a1",
          name: "Test",
          schedule: Schedule.oneTime(futureDate),
          targetId: "device-1",
          targetType: "light",
          command: "on",
        }),
      );
      errorEngine.start();

      await vi.advanceTimersByTimeAsync(5_000);
      expect(errorHandler).toHaveBeenCalled();
      expect(errorEngine.isRunning()).toBe(true);
      errorEngine.stop();
    });
  });
});
