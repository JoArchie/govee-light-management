import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionServices } from "../../../../src/backend/actions/shared/ActionServices";

describe("ActionServices.isDialInteractionActive", () => {
  let services: ActionServices;

  beforeEach(() => {
    vi.useFakeTimers();
    services = new ActionServices();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when no interaction is in flight", () => {
    expect(services.isDialInteractionActive("ctx-1")).toBe(false);
  });

  it("returns true while a deferred dial action is pending", () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    services.deferDialAction("ctx-1", callback, 500);

    expect(services.isDialInteractionActive("ctx-1")).toBe(true);
  });

  it("cleanupDialTimers clears the active flag for that context", () => {
    services.deferDialAction("ctx-1", vi.fn().mockResolvedValue(undefined), 500);
    expect(services.isDialInteractionActive("ctx-1")).toBe(true);

    services.cleanupDialTimers("ctx-1");

    expect(services.isDialInteractionActive("ctx-1")).toBe(false);
  });

  it("tracks interaction state independently per context id", () => {
    services.deferDialAction("ctx-a", vi.fn().mockResolvedValue(undefined), 500);

    expect(services.isDialInteractionActive("ctx-a")).toBe(true);
    expect(services.isDialInteractionActive("ctx-b")).toBe(false);
  });

  it("calls the deferred callback after the delay elapses and then clears the flag", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    services.deferDialAction("ctx-1", callback, 250);

    expect(callback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    // The callback may defer its cleanup via micro-tasks; flush them.
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("replaces the pending callback when a new deferDialAction is scheduled", async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);

    services.deferDialAction("ctx-1", first, 500);
    services.deferDialAction("ctx-1", second, 500);

    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
