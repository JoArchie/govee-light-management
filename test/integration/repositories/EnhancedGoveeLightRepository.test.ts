import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { EnhancedGoveeLightRepository } from "../../../src/backend/infrastructure/repositories/EnhancedGoveeLightRepository";
import {
  PluginError,
  ErrorCategory,
} from "../../../src/backend/infrastructure/errors/ErrorBoundaries";
import { ApiValidationError } from "../../../src/backend/infrastructure/validation/ApiResponseValidator";
import { CircuitBreakerOpenError } from "../../../src/backend/infrastructure/resilience/CircuitBreaker";

// Get mocked classes — vitest 4 requires function/class syntax for constructors
const mockGoveeClient = vi.hoisted(() => vi.fn(function () {}));

// Mock the Govee API client module
vi.mock("@felixgeelhaar/govee-api-client", () => ({
  GoveeClient: mockGoveeClient,
  ColorRgb: {
    fromHex: vi.fn(function (hex: string) {
      return { toString: () => hex, r: 255, g: 0, b: 0 };
    }),
  },
  Brightness: vi.fn(function (level: number) {
    return { level };
  }),
  ColorTemperature: vi.fn(function (kelvin: number) {
    return { kelvin };
  }),
}));

vi.mock("@elgato/streamdeck", () => ({
  default: {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe("EnhancedGoveeLightRepository Integration Tests", () => {
  let repository: EnhancedGoveeLightRepository;
  let mockClient: any;

  const mockDevices = [
    {
      deviceId: "test-device-1",
      model: "H6199",
      deviceName: "Living Room Light",
      canControl: () => true,
    },
    {
      deviceId: "test-device-2",
      model: "H6159",
      deviceName: "Bedroom Light",
      canControl: () => true,
    },
  ];

  const mockDeviceState = {
    getPowerState: () => "on",
    isOnline: () => true,
    getBrightness: () => ({ level: 75 }),
    getColor: () => ({ toString: () => "#FF0000", r: 255, g: 0, b: 0 }),
    getColorTemperature: () => undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getControllableDevices: vi.fn(),
      turnOn: vi.fn(),
      turnOff: vi.fn(),
      setBrightness: vi.fn(),
      setColor: vi.fn(),
      setColorTemperature: vi.fn(),
      turnOnWithBrightness: vi.fn(),
      turnOnWithColor: vi.fn(),
      turnOnWithColorTemperature: vi.fn(),
      getDeviceState: vi.fn(),
      getServiceStats: vi.fn(() => ({ requests: 0, failures: 0 })),
      // Additional methods for extended coverage
      setSegmentColors: vi.fn().mockResolvedValue(undefined),
      getMusicModes: vi.fn().mockResolvedValue([]),
      setMusicMode: vi.fn().mockResolvedValue(undefined),
      getToggleFeatures: vi.fn().mockResolvedValue([]),
      toggle: vi.fn().mockResolvedValue(undefined),
      setNightlight: vi.fn().mockResolvedValue(undefined),
      setGradientToggle: vi.fn().mockResolvedValue(undefined),
      setNightlightToggle: vi.fn().mockResolvedValue(undefined),
      setGradientToggle: vi.fn().mockResolvedValue(undefined),
      getDynamicScenes: vi.fn().mockResolvedValue([]),
      setLightScene: vi.fn().mockResolvedValue(undefined),
    };

    mockGoveeClient.mockImplementation(function () {
      return mockClient;
    });
    repository = new EnhancedGoveeLightRepository("test-api-key");
  });

  describe("getAllLights", () => {
    it("should return validated lights from API", async () => {
      mockClient.getControllableDevices.mockResolvedValue(mockDevices);

      const lights = await repository.getAllLights();

      expect(lights).toHaveLength(2);
      expect(lights[0].name).toBe("Living Room Light");
      expect(lights[0].deviceId).toBe("test-device-1");
      expect(lights[1].name).toBe("Bedroom Light");
      expect(lights[1].deviceId).toBe("test-device-2");
    });

    it("should debug the validation issue", async () => {
      // Test with a simple device first
      const simpleDevice = {
        deviceId: "test-device-1",
        model: "H6199",
        deviceName: "Living Room Light",
      };

      mockClient.getControllableDevices.mockResolvedValue([simpleDevice]);

      try {
        const lights = await repository.getAllLights();
        expect(lights).toHaveLength(1);
        expect(lights[0].name).toBe("Living Room Light");
      } catch (error) {
        console.error("Validation error:", error);
        throw error;
      }
    });

    it("should filter out invalid devices and continue with valid ones", async () => {
      const mixedDevices = [
        ...mockDevices,
        { deviceId: "", model: "H6199", deviceName: "Invalid Device" }, // Invalid: empty deviceId
        { deviceId: "valid-id", model: "", deviceName: "Another Invalid" }, // Invalid: empty model
      ];

      mockClient.getControllableDevices.mockResolvedValue(mixedDevices);

      const lights = await repository.getAllLights();

      // Should only return the 2 valid devices
      expect(lights).toHaveLength(2);
      expect(lights.every((light) => light.deviceId && light.model)).toBe(true);
    });

    it("should throw PluginError on API failure", async () => {
      mockClient.getControllableDevices.mockRejectedValue(
        new Error("API Error"),
      );

      await expect(repository.getAllLights()).rejects.toThrow(PluginError);
    });

    it("should handle network errors specifically", async () => {
      mockClient.getControllableDevices.mockRejectedValue(
        new Error("Network timeout"),
      );

      await expect(repository.getAllLights()).rejects.toThrow(PluginError);

      try {
        await repository.getAllLights();
      } catch (error) {
        expect(error).toBeInstanceOf(PluginError);
        expect((error as PluginError).category).toBe(
          ErrorCategory.NETWORK_ERROR,
        );
      }
    });

    it("should handle unauthorized errors", async () => {
      mockClient.getControllableDevices.mockRejectedValue(
        new Error("Unauthorized access"),
      );

      try {
        await repository.getAllLights();
      } catch (error) {
        expect(error).toBeInstanceOf(PluginError);
        expect((error as PluginError).category).toBe(
          ErrorCategory.CONFIGURATION_ERROR,
        );
      }
    });
  });

  describe("findLight", () => {
    it("should find and return specific light", async () => {
      mockClient.getControllableDevices.mockResolvedValue(mockDevices);

      const light = await repository.findLight("test-device-1", "H6199");

      expect(light).not.toBeNull();
      expect(light!.deviceId).toBe("test-device-1");
      expect(light!.name).toBe("Living Room Light");
    });

    it("should return null for non-existent light", async () => {
      mockClient.getControllableDevices.mockResolvedValue(mockDevices);

      const light = await repository.findLight("non-existent", "H6199");

      expect(light).toBeNull();
    });
  });

  describe("setPower", () => {
    it("should turn light on successfully", async () => {
      const lights = await setupLights();
      const light = lights[0];

      await repository.setPower(light, true);

      expect(mockClient.turnOn).toHaveBeenCalledWith("test-device-1", "H6199");
      expect(light.isOn).toBe(true);
    });

    it("should turn light off successfully", async () => {
      const lights = await setupLights();
      const light = lights[0];

      await repository.setPower(light, false);

      expect(mockClient.turnOff).toHaveBeenCalledWith("test-device-1", "H6199");
      expect(light.isOn).toBe(false);
    });

    it("should throw PluginError on device control failure", async () => {
      const lights = await setupLights();
      const light = lights[0];

      mockClient.turnOn.mockRejectedValue(new Error("Device not responding"));

      await expect(repository.setPower(light, true)).rejects.toThrow(
        PluginError,
      );
    });
  });

  describe("setBrightness", () => {
    it("should set brightness successfully", async () => {
      const lights = await setupLights();
      const light = lights[0];
      const brightness = { level: 80 };

      await repository.setBrightness(light, brightness);

      expect(mockClient.setBrightness).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        brightness,
      );
      expect(light.brightness?.level).toBe(80);
    });
  });

  describe("setColor", () => {
    it("should set color successfully", async () => {
      const lights = await setupLights();
      const light = lights[0];
      const color = { toString: () => "#00FF00", r: 0, g: 255, b: 0 };

      await repository.setColor(light, color);

      expect(mockClient.setColor).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        color,
      );
      expect(light.color).toEqual(color);
      expect(light.colorTemperature).toBeUndefined();
    });
  });

  describe("setColorTemperature", () => {
    it("should set color temperature successfully", async () => {
      const lights = await setupLights();
      const light = lights[0];
      const colorTemp = { kelvin: 3000 };

      await repository.setColorTemperature(light, colorTemp);

      expect(mockClient.setColorTemperature).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        colorTemp,
      );
      expect(light.colorTemperature).toEqual(colorTemp);
      expect(light.color).toBeUndefined();
    });
  });

  describe("getLightState", () => {
    it("should update light state from API", async () => {
      const lights = await setupLights();
      const light = lights[0];

      mockClient.getDeviceState.mockResolvedValue(mockDeviceState);

      await repository.getLightState(light);

      expect(light.isOn).toBe(true);
      expect(light.isOnline).toBe(true);
      expect(light.brightness?.level).toBe(75);
      expect(light.color?.toString()).toBe("#FF0000");
    });

    it("should handle device state validation errors", async () => {
      const lights = await setupLights();
      const light = lights[0];

      // Return invalid device state
      mockClient.getDeviceState.mockResolvedValue({
        getPowerState: "invalid-state", // Should be 'on' or 'off'
        isOnline: true, // Should be function
      });

      await expect(repository.getLightState(light)).rejects.toThrow(
        PluginError,
      );
    });
  });

  describe("Circuit Breaker Integration", () => {
    it("should open circuit breaker after repeated failures", async () => {
      mockClient.getControllableDevices.mockRejectedValue(
        new Error("Service unavailable"),
      );

      // Make multiple failed requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await repository.getAllLights();
        } catch (error) {
          // Expected to fail
        }
      }

      // Next request should fail with circuit breaker error
      await expect(repository.getAllLights()).rejects.toThrow();
    });

    it("should provide service stats including circuit breaker status", () => {
      const stats = repository.getServiceStats();

      expect(stats).toHaveProperty("client");
      expect(stats).toHaveProperty("circuitBreakers");
      expect(stats.circuitBreakers).toHaveProperty("api");
      expect(stats.circuitBreakers).toHaveProperty("devices");
    });

    it("should reset circuit breakers successfully", () => {
      expect(() => repository.resetCircuitBreakers()).not.toThrow();
    });
  });

  describe("Validation Integration", () => {
    it("should validate API response structure", async () => {
      // Return malformed device data
      mockClient.getControllableDevices.mockResolvedValue([
        { deviceId: null, model: "H6199", deviceName: "Invalid" },
      ]);

      const lights = await repository.getAllLights();

      // Should filter out invalid devices
      expect(lights).toHaveLength(0);
    });
  });

  describe("Error Categorization", () => {
    it("should categorize rate limit errors correctly", async () => {
      mockClient.getControllableDevices.mockRejectedValue(
        new Error("Rate limit exceeded"),
      );

      try {
        await repository.getAllLights();
      } catch (error) {
        expect(error).toBeInstanceOf(PluginError);
        expect((error as PluginError).category).toBe(ErrorCategory.API_ERROR);
        expect((error as PluginError).getUserMessage()).toContain(
          "Govee service",
        );
      }
    });

    it("should provide user-friendly error messages", async () => {
      mockClient.getControllableDevices.mockRejectedValue(
        new Error("Network timeout"),
      );

      try {
        await repository.getAllLights();
      } catch (error) {
        const pluginError = error as PluginError;
        expect(pluginError.getUserMessage()).toContain("connection");
        expect(pluginError.getRecoverySuggestions()).toContain(
          "Check your internet connection",
        );
      }
    });
  });

  describe("findLightsByName", () => {
    it("should find lights by partial name match", async () => {
      mockClient.getControllableDevices.mockResolvedValue(mockDevices);

      const lights = await repository.findLightsByName("Living");
      expect(lights).toHaveLength(1);
      expect(lights[0].name).toBe("Living Room Light");
    });

    it("should return empty array when no match", async () => {
      mockClient.getControllableDevices.mockResolvedValue(mockDevices);

      const lights = await repository.findLightsByName("NonExistent");
      expect(lights).toHaveLength(0);
    });

    it("should be case insensitive", async () => {
      mockClient.getControllableDevices.mockResolvedValue(mockDevices);

      const lights = await repository.findLightsByName("living");
      expect(lights).toHaveLength(1);
    });
  });

  describe("getLightState", () => {
    it("should update light state from API", async () => {
      const lights = await setupLights();
      const light = lights[0];

      mockClient.getDeviceState.mockResolvedValue(mockDeviceState);

      await repository.getLightState(light);

      expect(light.isOn).toBe(true);
      expect(light.isOnline).toBe(true);
      expect(light.brightness?.level).toBe(75);
      expect(light.color?.toString()).toBe("#FF0000");
    });

    it("should handle device state validation errors", async () => {
      const lights = await setupLights();
      const light = lights[0];

      // Return invalid device state
      mockClient.getDeviceState.mockResolvedValue({
        getPowerState: "invalid-state", // Should be 'on' or 'off'
        isOnline: true, // Should be function
      });

      await expect(repository.getLightState(light)).rejects.toThrow(
        PluginError,
      );
    });
  });

  describe("turnOnWithBrightness", () => {
    it("should turn on light with brightness", async () => {
      const lights = await setupLights();
      const light = lights[0];

      await repository.turnOnWithBrightness(light, { level: 50 });

      expect(mockClient.turnOnWithBrightness).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        { level: 50 },
      );
    });
  });

  describe("turnOnWithColor", () => {
    it("should turn on light with color", async () => {
      const lights = await setupLights();
      const light = lights[0];
      const color = { r: 255, g: 0, b: 0, toString: () => "#FF0000" };

      await repository.turnOnWithColor(light, color);

      expect(mockClient.turnOnWithColor).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        color,
        undefined,
      );
    });
  });

  describe("turnOnWithColorTemperature", () => {
    it("should turn on light with color temperature", async () => {
      const lights = await setupLights();
      const light = lights[0];
      const temp = { kelvin: 4000 };

      await repository.turnOnWithColorTemperature(light, temp);

      expect(mockClient.turnOnWithColorTemperature).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        temp,
        undefined,
      );
    });
  });

  describe("setMusicMode", () => {
    it("should reject invalid music mode config", async () => {
      const lights = await setupLights();

      // Invalid config - missing required fields
      await expect(
        repository.setMusicMode(lights[0], { mode: "invalid" } as any),
      ).rejects.toThrow();
    });
  });

  describe("toggleNightlight", () => {
    it("should enable nightlight", async () => {
      const lights = await setupLights();
      const light = lights[0];

      await repository.toggleNightlight(light, true);

      expect(mockClient.setNightlightToggle).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        true,
      );
    });
  });

  describe("toggleGradient", () => {
    it("should enable gradient", async () => {
      const lights = await setupLights();
      const light = lights[0];
      mockClient.setGradientToggle.mockResolvedValue(undefined);

      await repository.toggleGradient(light, true);

      expect(mockClient.setGradientToggle).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        true,
      );
    });
  });

  describe("getDynamicScenes", () => {
    it("should return dynamic scenes for device", async () => {
      mockClient.getDynamicScenes.mockResolvedValue([
        { code: "sunrise", name: "Sunrise" },
        { code: "sunset", name: "Sunset" },
      ]);

      const lights = await setupLights();
      const scenes = await repository.getDynamicScenes(lights[0]);

      expect(scenes).toHaveLength(2);
      expect(mockClient.getDynamicScenes).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
      );
    });
  });

  describe("setLightScene", () => {
    it("should set light scene", async () => {
      const lights = await setupLights();
      const light = lights[0];
      const scene = { code: "rainbow", name: "Rainbow" };

      await repository.setLightScene(light, scene);

      expect(mockClient.setLightScene).toHaveBeenCalledWith(
        "test-device-1",
        "H6199",
        scene,
      );
    });
  });

  describe("setSegmentColors", () => {
    it("should reject empty segment array", async () => {
      const lights = await setupLights();
      const light = lights[0];

      await expect(repository.setSegmentColors(light, [])).rejects.toThrow(
        "At least one segment color must be provided",
      );
    });
  });

  describe("getServiceStats", () => {
    it("should return comprehensive service statistics", () => {
      mockClient.getServiceStats.mockReturnValue({
        requests: 100,
        failures: 5,
      });

      const stats = repository.getServiceStats();

      expect(stats.client).toBeDefined();
      expect(stats.circuitBreakers).toBeDefined();
      expect(stats.circuitBreakers.api).toBeDefined();
      expect(stats.circuitBreakers.devices).toBeDefined();
    });
  });

  describe("resetCircuitBreakers", () => {
    it("should reset all circuit breakers", () => {
      expect(() => repository.resetCircuitBreakers()).not.toThrow();
    });
  });

  // Helper function to set up lights for testing
  async function setupLights() {
    mockClient.getControllableDevices.mockResolvedValue(mockDevices);
    return await repository.getAllLights();
  }
});
