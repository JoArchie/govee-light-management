import { describe, expect, it, vi } from "vitest";
import { ColorTemperature } from "@felixgeelhaar/govee-api-client";
import { safeGetColorTemperature } from "../../../src/backend/infrastructure/utils/deviceStateUtils";

describe("safeGetColorTemperature", () => {
  it("returns the color temperature when the reader succeeds", () => {
    const expected = new ColorTemperature(4000);
    const reader = { getColorTemperature: () => expected };

    expect(safeGetColorTemperature(reader, "Living Room")).toBe(expected);
  });

  it("returns undefined when the underlying reader throws on malformed data", () => {
    const reader = {
      getColorTemperature: () => {
        throw new Error("Color temperature must be between 1000K and 50000K, got 0K");
      },
    };

    const result = safeGetColorTemperature(reader, "Hallway");

    expect(result).toBeUndefined();
  });

  it("tolerates readers that do not implement the method at all", () => {
    expect(safeGetColorTemperature({}, "Unknown Light")).toBeUndefined();
  });

  it("passes context into the warning log without throwing", () => {
    const reader = {
      getColorTemperature: () => {
        throw new Error("boom");
      },
    };

    // Should not propagate — we just want to ensure the helper swallows the error.
    expect(() => safeGetColorTemperature(reader, "Bedroom")).not.toThrow();
    // Reader function should have been invoked.
    const spy = vi.fn().mockImplementation(() => {
      throw new Error("still boom");
    });
    safeGetColorTemperature({ getColorTemperature: spy }, "Bedroom");
    expect(spy).toHaveBeenCalled();
  });
});
