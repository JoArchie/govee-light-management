import { ColorRgb } from "@felixgeelhaar/govee-api-client";

/**
 * Extract hue (0-360) from an RGB ColorRgb instance.
 * Returns 0 for achromatic colors (grays).
 */
export function rgbToHue(color: ColorRgb): number {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return 0;

  let h: number;
  if (max === r) {
    h = ((g - b) / delta + 6) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

/**
 * Convert HSV color values to an RGB ColorRgb instance.
 * @param h Hue in degrees (0-360)
 * @param s Saturation percentage (0-100)
 * @param v Value/brightness percentage (0-100)
 */
export function hsvToRgb(h: number, s: number, v: number): ColorRgb {
  const sn = s / 100,
    vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return new ColorRgb(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  );
}
