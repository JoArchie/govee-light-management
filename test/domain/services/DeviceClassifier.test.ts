import { describe, it, expect } from "vitest";
import {
  DeviceClassifier,
  DeviceClass,
} from "../../../src/backend/domain/services/DeviceClassifier";

describe("DeviceClassifier", () => {
  describe("Strip Detection", () => {
    it("should classify H619A as LedStrip", () => {
      expect(DeviceClassifier.classify("H619A")).toBe(DeviceClass.LedStrip);
    });

    it("should classify H61A0 as LedStrip", () => {
      expect(DeviceClassifier.classify("H61A0")).toBe(DeviceClass.LedStrip);
    });

    it("should classify H6199 as LedStrip", () => {
      expect(DeviceClassifier.classify("H6199")).toBe(DeviceClass.LedStrip);
    });
  });

  describe("Bulb Detection", () => {
    it("should classify H6008 as Bulb", () => {
      expect(DeviceClassifier.classify("H6008")).toBe(DeviceClass.Bulb);
    });

    it("should classify H6001 as Bulb", () => {
      expect(DeviceClassifier.classify("H6001")).toBe(DeviceClass.Bulb);
    });
  });

  describe("Light Bar Detection", () => {
    it("should classify H6054 as LightBar", () => {
      expect(DeviceClassifier.classify("H6054")).toBe(DeviceClass.LightBar);
    });

    it("should classify H6047 as LightBar", () => {
      expect(DeviceClassifier.classify("H6047")).toBe(DeviceClass.LightBar);
    });
  });

  describe("Floor Lamp Detection", () => {
    it("should classify H6072 as FloorLamp", () => {
      expect(DeviceClassifier.classify("H6072")).toBe(DeviceClass.FloorLamp);
    });
  });

  describe("Unknown Models", () => {
    it("should classify unknown models as Unknown", () => {
      expect(DeviceClassifier.classify("XYZ999")).toBe(DeviceClass.Unknown);
    });

    it("should handle empty string", () => {
      expect(DeviceClassifier.classify("")).toBe(DeviceClass.Unknown);
    });
  });

  describe("Display Name", () => {
    it("should return human-readable names", () => {
      expect(DeviceClassifier.displayName(DeviceClass.Bulb)).toBe("Bulb");
      expect(DeviceClassifier.displayName(DeviceClass.LedStrip)).toBe(
        "LED Strip",
      );
      expect(DeviceClassifier.displayName(DeviceClass.LightBar)).toBe(
        "Light Bar",
      );
      expect(DeviceClassifier.displayName(DeviceClass.FloorLamp)).toBe(
        "Floor Lamp",
      );
      expect(DeviceClassifier.displayName(DeviceClass.Unknown)).toBe(
        "Light",
      );
    });
  });

  describe("Icon Mapping", () => {
    it("should return appropriate icon names", () => {
      expect(DeviceClassifier.iconName(DeviceClass.Bulb)).toBe("bulb");
      expect(DeviceClassifier.iconName(DeviceClass.LedStrip)).toBe("strip");
      expect(DeviceClassifier.iconName(DeviceClass.LightBar)).toBe("bar");
      expect(DeviceClassifier.iconName(DeviceClass.FloorLamp)).toBe("lamp");
      expect(DeviceClassifier.iconName(DeviceClass.Unknown)).toBe("light");
    });
  });
});
