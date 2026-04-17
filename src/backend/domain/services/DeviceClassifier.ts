/**
 * Device classes for Govee smart lights.
 * Derived from model number patterns.
 */
export enum DeviceClass {
  Bulb = "bulb",
  LedStrip = "led-strip",
  LightBar = "light-bar",
  FloorLamp = "floor-lamp",
  Unknown = "unknown",
}

interface ModelRange {
  pattern: RegExp;
  deviceClass: DeviceClass;
}

/**
 * Map Govee model numbers to device classes.
 * Based on publicly documented Govee model line conventions:
 * - H60XX = Bulbs
 * - H604X = Light Bars
 * - H607X = Floor/Table Lamps
 * - H619X, H61AX, H61XX (strip) = LED Strips
 *
 * Source: Govee Developer API documentation and community catalogs.
 */
const MODEL_RANGES: ModelRange[] = [
  { pattern: /^H619[0-9A-Z]$/i, deviceClass: DeviceClass.LedStrip },
  { pattern: /^H61A[0-9A-Z]$/i, deviceClass: DeviceClass.LedStrip },
  { pattern: /^H61[5-9][0-9]$/i, deviceClass: DeviceClass.LedStrip },
  { pattern: /^H604[0-9]$/i, deviceClass: DeviceClass.LightBar },
  { pattern: /^H605[0-9]$/i, deviceClass: DeviceClass.LightBar },
  { pattern: /^H607[0-9]$/i, deviceClass: DeviceClass.FloorLamp },
  { pattern: /^H608[0-9]$/i, deviceClass: DeviceClass.FloorLamp },
  { pattern: /^H600[0-9]$/i, deviceClass: DeviceClass.Bulb },
];

/**
 * Service for classifying Govee devices by their model number.
 * Provides device class detection, display names, and icon hints.
 */
export class DeviceClassifier {
  /**
   * Determine the device class from a model number.
   * Returns DeviceClass.Unknown for unrecognized models.
   */
  static classify(model: string): DeviceClass {
    if (!model) return DeviceClass.Unknown;

    const normalized = model.trim().toUpperCase();
    for (const range of MODEL_RANGES) {
      if (range.pattern.test(normalized)) {
        return range.deviceClass;
      }
    }
    return DeviceClass.Unknown;
  }

  /**
   * Get a human-readable display name for a device class.
   */
  static displayName(deviceClass: DeviceClass): string {
    switch (deviceClass) {
      case DeviceClass.Bulb:
        return "Bulb";
      case DeviceClass.LedStrip:
        return "LED Strip";
      case DeviceClass.LightBar:
        return "Light Bar";
      case DeviceClass.FloorLamp:
        return "Floor Lamp";
      case DeviceClass.Unknown:
      default:
        return "Light";
    }
  }

  /**
   * Get an icon identifier for a device class.
   * Useful for UI display in Property Inspectors.
   */
  static iconName(deviceClass: DeviceClass): string {
    switch (deviceClass) {
      case DeviceClass.Bulb:
        return "bulb";
      case DeviceClass.LedStrip:
        return "strip";
      case DeviceClass.LightBar:
        return "bar";
      case DeviceClass.FloorLamp:
        return "lamp";
      case DeviceClass.Unknown:
      default:
        return "light";
    }
  }
}
