import { Light } from "../entities/Light";
import { DeviceClassifier } from "./DeviceClassifier";

/**
 * Stable identifiers for all light capabilities.
 */
export enum CapabilityKey {
  Brightness = "brightness",
  Color = "color",
  ColorTemperature = "colorTemperature",
  Scenes = "scenes",
  SegmentedColor = "segmentedColor",
  MusicMode = "musicMode",
  Nightlight = "nightlight",
  Gradient = "gradient",
}

export interface CapabilityMetadata {
  key: CapabilityKey;
  displayName: string;
  description: string;
  /** True if this capability requires specific hardware (e.g. RGB IC strips) */
  requiresSpecialHardware: boolean;
  /** Short user-facing description when capability is unsupported */
  missingHint: string;
}

const METADATA: Record<CapabilityKey, CapabilityMetadata> = {
  [CapabilityKey.Brightness]: {
    key: CapabilityKey.Brightness,
    displayName: "Brightness",
    description: "Adjust brightness from 0 to 100%",
    requiresSpecialHardware: false,
    missingHint: "Basic dimming is supported by all Govee smart lights",
  },
  [CapabilityKey.Color]: {
    key: CapabilityKey.Color,
    displayName: "Color",
    description: "Set an RGB color",
    requiresSpecialHardware: false,
    missingHint: "Color control is not available on white-only lights",
  },
  [CapabilityKey.ColorTemperature]: {
    key: CapabilityKey.ColorTemperature,
    displayName: "Color Temperature",
    description: "Adjust white temperature from 2000K to 9000K",
    requiresSpecialHardware: false,
    missingHint: "Color temperature is only available on tunable-white lights",
  },
  [CapabilityKey.Scenes]: {
    key: CapabilityKey.Scenes,
    displayName: "Scenes",
    description: "Apply preset lighting scenes (Sunrise, Aurora, etc.)",
    requiresSpecialHardware: false,
    missingHint: "Scene support is only available on RGB-capable lights",
  },
  [CapabilityKey.SegmentedColor]: {
    key: CapabilityKey.SegmentedColor,
    displayName: "Segmented Color",
    description: "Per-segment color control on RGB IC light strips",
    requiresSpecialHardware: true,
    missingHint:
      "Segmented color requires an RGB IC light strip (e.g. Govee H619A)",
  },
  [CapabilityKey.MusicMode]: {
    key: CapabilityKey.MusicMode,
    displayName: "Music Mode",
    description: "Audio-reactive lighting that pulses with sound",
    requiresSpecialHardware: false,
    missingHint:
      "Music mode is available on most RGB-capable lights with a built-in microphone",
  },
  [CapabilityKey.Nightlight]: {
    key: CapabilityKey.Nightlight,
    displayName: "Nightlight",
    description: "Soft ambient nightlight mode",
    requiresSpecialHardware: false,
    missingHint: "Nightlight mode is only available on specific Govee models",
  },
  [CapabilityKey.Gradient]: {
    key: CapabilityKey.Gradient,
    displayName: "Gradient",
    description: "Multi-color gradient effects",
    requiresSpecialHardware: true,
    missingHint: "Gradient effects require a compatible RGB IC light strip",
  },
};

/**
 * Central registry for light capabilities.
 * Provides metadata, capability checking, filtering, and user-friendly error messages.
 */
export class CapabilityRegistry {
  static getMetadata(key: CapabilityKey): CapabilityMetadata {
    return METADATA[key];
  }

  static hasCapability(light: Light, key: CapabilityKey): boolean {
    const caps = light.capabilities as Record<string, boolean>;
    return caps[key] === true;
  }

  /**
   * Generate a user-friendly error message for an unsupported capability.
   * Includes device name, class, and a helpful hint.
   */
  static unsupportedMessage(light: Light, key: CapabilityKey): string {
    const meta = METADATA[key];
    const deviceClass = DeviceClassifier.classify(light.model);
    const deviceType = DeviceClassifier.displayName(deviceClass);

    return `${light.name} (${deviceType}) doesn't support ${meta.displayName.toLowerCase()}. ${meta.missingHint}.`;
  }

  /**
   * List all capabilities currently supported by a light.
   */
  static listSupported(light: Light): CapabilityKey[] {
    return Object.values(CapabilityKey).filter((key) =>
      CapabilityRegistry.hasCapability(light, key),
    );
  }

  /**
   * Filter an array of lights to only those supporting the given capability.
   */
  static filterByCapability(lights: Light[], key: CapabilityKey): Light[] {
    return lights.filter((l) => CapabilityRegistry.hasCapability(l, key));
  }
}
