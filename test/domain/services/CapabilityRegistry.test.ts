import { describe, it, expect } from "vitest";
import {
  CapabilityRegistry,
  CapabilityKey,
} from "../../../src/backend/domain/services/CapabilityRegistry";
import { Light } from "../../../src/backend/domain/entities/Light";

function createLight(caps: Partial<Record<string, boolean>> = {}): Light {
  return Light.create(
    "device-1",
    "H619A",
    "Test Light",
    { isOn: false, isOnline: true },
    {
      brightness: true,
      color: true,
      colorTemperature: true,
      scenes: false,
      segmentedColor: false,
      musicMode: false,
      nightlight: false,
      gradient: false,
      ...caps,
    } as Parameters<typeof Light.create>[4],
  );
}

describe("CapabilityRegistry", () => {
  describe("Capability Metadata", () => {
    it("should return metadata for brightness", () => {
      const meta = CapabilityRegistry.getMetadata(CapabilityKey.Brightness);
      expect(meta.displayName).toBe("Brightness");
      expect(meta.description.length).toBeGreaterThan(0);
    });

    it("should return metadata for segmentedColor", () => {
      const meta = CapabilityRegistry.getMetadata(CapabilityKey.SegmentedColor);
      expect(meta.displayName).toBe("Segmented Color");
      expect(meta.requiresSpecialHardware).toBe(true);
    });
  });

  describe("Capability Check", () => {
    it("should return true when light supports capability", () => {
      const light = createLight({ scenes: true });
      expect(CapabilityRegistry.hasCapability(light, CapabilityKey.Scenes)).toBe(
        true,
      );
    });

    it("should return false when light doesn't support capability", () => {
      const light = createLight({ scenes: false });
      expect(CapabilityRegistry.hasCapability(light, CapabilityKey.Scenes)).toBe(
        false,
      );
    });
  });

  describe("Error Messages", () => {
    it("should generate helpful error for missing capability", () => {
      const light = createLight({ musicMode: false });
      const msg = CapabilityRegistry.unsupportedMessage(
        light,
        CapabilityKey.MusicMode,
      );
      expect(msg).toContain("Test Light");
      expect(msg).toContain("music");
      expect(msg.toLowerCase()).toContain("doesn't support");
    });

    it("should include device class in error message when available", () => {
      const light = createLight({ segmentedColor: false });
      const msg = CapabilityRegistry.unsupportedMessage(
        light,
        CapabilityKey.SegmentedColor,
      );
      // H619A should be classified as LED Strip
      expect(msg).toContain("LED Strip");
    });
  });

  describe("All Capabilities", () => {
    it("should list all capabilities of a light", () => {
      const light = createLight({
        scenes: true,
        segmentedColor: true,
        musicMode: false,
      });
      const supported = CapabilityRegistry.listSupported(light);
      expect(supported).toContain(CapabilityKey.Scenes);
      expect(supported).toContain(CapabilityKey.SegmentedColor);
      expect(supported).not.toContain(CapabilityKey.MusicMode);
    });
  });

  describe("Filter Lights by Capability", () => {
    it("should filter an array of lights by required capability", () => {
      const lights = [
        createLight({ scenes: true }),
        createLight({ scenes: false }),
        createLight({ scenes: true }),
      ];
      const filtered = CapabilityRegistry.filterByCapability(
        lights,
        CapabilityKey.Scenes,
      );
      expect(filtered).toHaveLength(2);
    });
  });
});
