import { describe, expect, it } from "vitest";
import {
  kelvinToBarValue,
  normalizeKelvin,
  type KelvinRange,
} from "../../../../src/backend/actions/shared/kelvin-utils";

const range = (
  min: number,
  max: number,
  precision: number,
): KelvinRange => ({ min, max, precision });

describe("normalizeKelvin", () => {
  it("clamps to the range min when the value is below it", () => {
    expect(normalizeKelvin(1500, range(2700, 6500, 100))).toBe(2700);
  });

  it("clamps to the range max when the value is above it", () => {
    expect(normalizeKelvin(7200, range(2700, 6500, 100))).toBe(6500);
  });

  it("snaps to the device precision step", () => {
    // 3000 + 22 should round up to the nearest 50K step (3050).
    expect(normalizeKelvin(3022, range(2700, 6500, 50))).toBe(3000);
    expect(normalizeKelvin(3030, range(2700, 6500, 50))).toBe(3050);
  });

  it("treats precision 0 as 1K to avoid division by zero", () => {
    expect(normalizeKelvin(3333, range(2700, 6500, 0))).toBe(3333);
  });

  it("keeps the snapped value within the clamped range", () => {
    // A snap that would overshoot max should be clamped back.
    expect(normalizeKelvin(6490, range(2700, 6500, 50))).toBe(6500);
  });
});

describe("kelvinToBarValue", () => {
  it("maps the range min to 0 and max to 100", () => {
    expect(kelvinToBarValue(2700, 2700, 6500)).toBe(0);
    expect(kelvinToBarValue(6500, 2700, 6500)).toBe(100);
  });

  it("interpolates mid-range values", () => {
    expect(kelvinToBarValue(4600, 2700, 6500)).toBe(50);
  });

  it("returns 0 for a degenerate range", () => {
    expect(kelvinToBarValue(3000, 3000, 3000)).toBe(0);
    expect(kelvinToBarValue(3000, 6500, 2700)).toBe(0);
  });
});
