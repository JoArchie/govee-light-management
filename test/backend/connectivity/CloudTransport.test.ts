import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudTransport } from "@/backend/connectivity/cloud/CloudTransport";
import { globalSettingsService } from "@/backend/services/GlobalSettingsService";

interface DeviceFixture {
  deviceId: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportedCmds: readonly string[];
  capabilities: ReadonlyArray<{
    type: string;
    instance: string;
    parameters?: Record<string, unknown>;
  }>;
}

const buildDevice = (
  overrides: Partial<DeviceFixture> = {},
): DeviceFixture => ({
  deviceId: "dev-1",
  model: "H6001",
  deviceName: "Test Light",
  controllable: true,
  retrievable: true,
  supportedCmds: [],
  capabilities: [],
  ...overrides,
});

describe("CloudTransport.discoverDevices", () => {
  beforeEach(() => {
    vi.spyOn(globalSettingsService, "getApiKey").mockResolvedValue("abcd1234");
  });

  it("exposes the device-specific color temperature range when advertised via capability.parameters.range", async () => {
    const device = buildDevice({
      capabilities: [
        { type: "devices.capabilities.color_setting", instance: "colorRgb" },
        {
          type: "devices.capabilities.color_setting",
          instance: "colorTemperatureK",
          parameters: {
            range: { min: 2700, max: 6500, precision: 50 },
          },
        },
      ],
    });

    const transport = new CloudTransport({
      factory: {
        create: () =>
          ({
            getControllableDevices: vi.fn().mockResolvedValue([device]),
          }) as never,
      },
    });

    const { lights } = await transport.discoverDevices();

    expect(lights).toHaveLength(1);
    expect(lights[0]?.properties?.colorTem?.range).toEqual({
      min: 2700,
      max: 6500,
      precision: 50,
    });
    expect(lights[0]?.capabilities?.colorTemperature).toBe(true);
  });

  it("falls back to nested parameters.fields when top-level range is absent", async () => {
    const device = buildDevice({
      capabilities: [
        {
          type: "devices.capabilities.dynamic_setting",
          instance: "dynamicScene",
          parameters: {
            fields: [
              {
                fieldName: "colorTemperatureK",
                range: { min: 3000, max: 6000, precision: 100 },
              },
            ],
          },
        },
      ],
    });

    const transport = new CloudTransport({
      factory: {
        create: () =>
          ({
            getControllableDevices: vi.fn().mockResolvedValue([device]),
          }) as never,
      },
    });

    const { lights } = await transport.discoverDevices();

    expect(lights[0]?.properties?.colorTem?.range).toEqual({
      min: 3000,
      max: 6000,
      precision: 100,
    });
    // When a range is discovered via nested fields, the capability must
    // still be advertised as supported so the UI does not hide it.
    expect(lights[0]?.capabilities?.colorTemperature).toBe(true);
  });

  it("omits the colorTem properties block when no capability advertises a range", async () => {
    const device = buildDevice({
      capabilities: [
        { type: "devices.capabilities.color_setting", instance: "colorRgb" },
      ],
    });

    const transport = new CloudTransport({
      factory: {
        create: () =>
          ({
            getControllableDevices: vi.fn().mockResolvedValue([device]),
          }) as never,
      },
    });

    const { lights } = await transport.discoverDevices();

    expect(lights[0]?.properties).toBeUndefined();
    expect(lights[0]?.capabilities?.colorTemperature).toBe(false);
  });

  it("treats either colorTemperatureK or colorTemInKelvin as a supported capability", async () => {
    const legacyDevice = buildDevice({
      deviceId: "legacy",
      capabilities: [
        {
          type: "devices.capabilities.color_setting",
          instance: "colorTemInKelvin",
        },
      ],
    });

    const transport = new CloudTransport({
      factory: {
        create: () =>
          ({
            getControllableDevices: vi.fn().mockResolvedValue([legacyDevice]),
          }) as never,
      },
    });

    const { lights } = await transport.discoverDevices();
    expect(lights[0]?.capabilities?.colorTemperature).toBe(true);
  });
});
