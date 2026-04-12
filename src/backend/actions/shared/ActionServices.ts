/**
 * Shared services and utilities for all light actions.
 * Handles device/group resolution, service initialization, and
 * the getDevices datasource that returns both lights and groups.
 */
import { streamDeck } from "@elgato/streamdeck";
// Internal SDK connection singleton — used to send sendToPropertyInspector
// messages to a specific action context (the global streamDeck.ui.sendToPropertyInspector
// tracks a single #action which can be stale or undefined during async operations).
import { connection } from "@elgato/streamdeck/dist/plugin/connection.js";
import type { JsonValue } from "@elgato/utils";
import { GoveeLightRepository } from "../../infrastructure/repositories/GoveeLightRepository";
import { LightControlService } from "../../domain/services/LightControlService";
import { Light, LightCapabilities } from "../../domain/entities/Light";
import { LightGroup } from "../../domain/entities/LightGroup";
import type { LightState } from "../../domain/value-objects/LightState";
import {
  Brightness,
  ColorRgb,
  ColorTemperature,
  LightScene,
  MusicMode,
} from "@felixgeelhaar/govee-api-client";

import { DeviceService } from "../../domain/services/DeviceService";
import {
  TransportOrchestrator,
  TransportKind,
  CloudTransport,
} from "../../connectivity";
import { globalSettingsService } from "../../services/GlobalSettingsService";
import { StreamDeckLightGroupRepository } from "../../infrastructure/repositories/StreamDeckLightGroupRepository";
import { LightGroupService } from "../../domain/services/LightGroupService";
import { SegmentColor } from "../../domain/value-objects/SegmentColor";

/** Default timeout for API calls in PI handlers (10 seconds) */
const PI_HANDLER_TIMEOUT_MS = 10_000;

/**
 * Send a payload to the Property Inspector for a specific action context.
 * Uses the SDK's internal connection to bypass the global ui.#action tracking,
 * which can silently drop messages when #action is undefined or stale.
 */
async function sendToPI(
  actionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await connection.send({
      event: "sendToPropertyInspector",
      context: actionId,
      payload,
    });
  } catch (error) {
    streamDeck.logger.error(
      `Failed to send to PI (context: ${actionId}):`,
      error,
    );
  }
}

/**
 * Race a promise against a timeout. Returns the promise result or rejects on timeout.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export { sendToPI };

export interface DeviceTarget {
  type: "light" | "group";
  light?: Light;
  group?: LightGroup;
}

export interface BaseSettings {
  apiKey?: string;
  selectedDeviceId?: string;
  selectedModel?: string;
  selectedLightName?: string;
  [key: string]: JsonValue | undefined;
}

/**
 * Manages shared services for light/group actions.
 * Uses static shared state so all action instances share a single
 * GoveeLightRepository and rate limiter.
 */
export class ActionServices {
  private static _shared: {
    lightRepository?: GoveeLightRepository;
    lightControlService?: LightControlService;
    groupRepository?: StreamDeckLightGroupRepository;
    groupService?: LightGroupService;
    transportOrchestrator?: TransportOrchestrator;
    deviceService?: DeviceService;
    currentApiKey?: string;
  } = {};

  get lightRepository() {
    return ActionServices._shared.lightRepository;
  }
  get lightControlService() {
    return ActionServices._shared.lightControlService;
  }
  get groupService() {
    return ActionServices._shared.groupService;
  }
  get deviceService() {
    return ActionServices._shared.deviceService;
  }

  async ensureServices(apiKey?: string): Promise<void> {
    const s = ActionServices._shared;

    if (!s.groupRepository) {
      s.groupRepository = new StreamDeckLightGroupRepository();
    }

    if (apiKey && apiKey !== s.currentApiKey) {
      s.lightRepository = new GoveeLightRepository(apiKey, true);
      s.lightControlService = new LightControlService(s.lightRepository);
      s.groupService = new LightGroupService(
        s.groupRepository,
        s.lightRepository,
      );
      s.currentApiKey = apiKey;

      try {
        await globalSettingsService.setApiKey(apiKey);
      } catch (error) {
        streamDeck.logger?.warn("Failed to persist API key globally", error);
      }
    }

    if (s.lightRepository && !s.lightControlService) {
      s.lightControlService = new LightControlService(s.lightRepository);
    }

    if (s.groupRepository && s.lightRepository && !s.groupService) {
      s.groupService = new LightGroupService(
        s.groupRepository,
        s.lightRepository,
      );
    }

    if (!s.transportOrchestrator) {
      const cloudTransport = new CloudTransport();
      s.transportOrchestrator = new TransportOrchestrator({
        [TransportKind.Cloud]: cloudTransport,
      });
    }

    if (s.transportOrchestrator && !s.deviceService) {
      s.deviceService = new DeviceService(s.transportOrchestrator, {
        logger: streamDeck.logger,
      });
    }
  }

  async getApiKey(settings: BaseSettings): Promise<string | undefined> {
    return settings.apiKey || (await globalSettingsService.getApiKey());
  }

  /**
   * Parse the selectedDeviceId to determine if it's a light or group.
   * Format: "light:deviceId|model" or "group:groupId"
   * Legacy format (no prefix): "deviceId|model" treated as light
   */
  parseTarget(settings: BaseSettings): {
    type: "light" | "group";
    deviceId?: string;
    model?: string;
    groupId?: string;
  } | null {
    const id = settings.selectedDeviceId;
    if (!id) return null;

    if (id.startsWith("group:")) {
      return { type: "group", groupId: id.substring(6) };
    }

    // Light target (with or without prefix)
    const lightId = id.startsWith("light:") ? id.substring(6) : id;
    if (lightId.includes("|")) {
      const [deviceId, model] = lightId.split("|");
      return { type: "light", deviceId, model };
    }

    if (settings.selectedModel) {
      return {
        type: "light",
        deviceId: lightId,
        model: settings.selectedModel,
      };
    }

    return null;
  }

  /**
   * Resolve the target to a Light or LightGroup instance.
   * Uses DeviceService cache for lights to avoid repeated API calls.
   */
  async resolveTarget(
    settings: BaseSettings,
    forceRefresh = false,
  ): Promise<DeviceTarget | null> {
    const target = this.parseTarget(settings);
    if (!target) return null;

    if (target.type === "group" && target.groupId) {
      if (!this.groupService) return null;
      const group = await this.groupService.findGroupById(target.groupId);
      if (group) return { type: "group", group };
    }

    if (
      target.type === "light" &&
      target.deviceId &&
      target.model &&
      this.deviceService
    ) {
      // Use DeviceService with its built-in caching (15s TTL)
      const lights = await this.deviceService.discover(forceRefresh);
      const lightItem = lights.find(
        (l) => l.deviceId === target.deviceId && l.model === target.model,
      );

      if (lightItem) {
        // Convert LightItem to domain Light entity using Light.create()
        // LightItem doesn't carry live state, so we use sensible defaults.
        // Actual state is fetched via getLightState() when needed by actions.
        const initialState: LightState = {
          isOn: false,
          isOnline: lightItem.controllable,
          brightness: undefined,
          color: undefined,
          colorTemperature: undefined,
        };

        // Map shared LightCapabilities to domain LightCapabilities
        const capabilities: LightCapabilities = {
          brightness: lightItem.capabilities?.brightness ?? true,
          color: lightItem.capabilities?.color ?? true,
          colorTemperature: lightItem.capabilities?.colorTemperature ?? true,
          scenes: lightItem.capabilities?.scenes ?? false,
          segmentedColor: false,
          musicMode: false,
          nightlight: false,
          gradient: false,
        };

        const light = Light.create(
          lightItem.deviceId,
          lightItem.model,
          lightItem.name,
          initialState,
          capabilities,
        );
        return { type: "light", light };
      }
    }

    return null;
  }

  /**
   * Handle getGroups - returns group list for group manager UI
   */
  async handleGetGroups(actionId: string): Promise<void> {
    try {
      const apiKey = await globalSettingsService.getApiKey();
      if (!apiKey) {
        await sendToPI(actionId, {
          event: "groupsReceived",
          groups: [],
        });
        return;
      }
      await this.ensureServices(apiKey);
      if (!this.groupService) {
        await sendToPI(actionId, {
          event: "groupsReceived",
          groups: [],
        });
        return;
      }
      const groups = await this.groupService.getAllGroups();
      await sendToPI(actionId, {
        event: "groupsReceived",
        groups: groups.map((g) => ({ id: g.id, name: g.name, size: g.size })),
      });
    } catch (error) {
      streamDeck.logger.error("Failed to fetch groups:", error);
      await sendToPI(actionId, {
        event: "groupsReceived",
        groups: [],
      });
    }
  }

  /**
   * Handle getDevices SDPI datasource - returns both lights and groups.
   * Uses a timeout to prevent hanging forever if the API is unreachable.
   */
  async handleGetDevices(actionId: string): Promise<void> {
    streamDeck.logger.info(`handleGetDevices called (context: ${actionId})`);

    try {
      const apiKey = await globalSettingsService.getApiKey();
      if (!apiKey) {
        streamDeck.logger.warn(
          "handleGetDevices: no API key in global settings",
        );
        await sendToPI(actionId, {
          event: "getDevices",
          items: [],
        });
        return;
      }

      await this.ensureServices(apiKey);
      const items: Array<{
        label: string;
        value: string;
        children?: Array<{ label: string; value: string }>;
      }> = [];

      // Add lights (with timeout to prevent hanging)
      if (this.deviceService) {
        try {
          const lights = await withTimeout(
            this.deviceService.discover(true),
            PI_HANDLER_TIMEOUT_MS,
            "Device discovery",
          );
          const lightItems = lights.map((light) => ({
            label: `${light.label ?? light.name} (${light.model})`,
            value: `light:${light.deviceId}|${light.model}`,
          }));

          if (lightItems.length > 0) {
            items.push({
              label: "Lights",
              value: "",
              children: lightItems,
            });
          }
          streamDeck.logger.info(
            `handleGetDevices: found ${lightItems.length} lights`,
          );
        } catch (discoverError) {
          streamDeck.logger.error(
            "handleGetDevices: device discovery failed:",
            discoverError,
          );
          // Continue to still return groups even if light discovery fails
        }
      }

      // Add groups
      if (this.groupService) {
        const groups = await this.groupService.getAllGroups();
        const groupItems = groups.map((g) => ({
          label: `${g.name} (${g.size} lights)`,
          value: `group:${g.id}`,
        }));

        if (groupItems.length > 0) {
          items.push({
            label: "Groups",
            value: "",
            children: groupItems,
          });
        }
      }

      streamDeck.logger.info(
        `handleGetDevices: sending ${items.length} item groups to PI`,
      );
      await sendToPI(actionId, {
        event: "getDevices",
        items,
      });
    } catch (error) {
      streamDeck.logger.error("Failed to fetch devices:", error);
      await sendToPI(actionId, {
        event: "getDevices",
        items: [],
      });
    }
  }

  /**
   * Handle saveGroup from PI
   */
  async handleSaveGroup(actionId: string, payload: JsonValue): Promise<void> {
    const data = payload as { group?: { name: string; lightIds: string[] } };
    const group = data.group;

    if (!group?.name || !group?.lightIds) {
      await sendToPI(actionId, {
        event: "groupSaved",
        success: false,
        error: "Invalid group data",
      });
      return;
    }

    try {
      const apiKey = await globalSettingsService.getApiKey();
      await this.ensureServices(apiKey);

      if (!this.groupService) throw new Error("Group service unavailable");

      const lightIds = group.lightIds.map((id: string) => {
        // Strip "light:" prefix if present
        const cleanId = id.startsWith("light:") ? id.substring(6) : id;
        const [deviceId, model] = cleanId.split("|");
        return { deviceId, model };
      });

      const savedGroup = await this.groupService.createGroup(
        group.name,
        lightIds,
      );

      await sendToPI(actionId, {
        event: "groupSaved",
        success: true,
        group: {
          id: savedGroup.id,
          name: savedGroup.name,
          size: savedGroup.size,
        },
      });
    } catch (error) {
      streamDeck.logger.error("Failed to save group:", error);
      await sendToPI(actionId, {
        event: "groupSaved",
        success: false,
        error: "Failed to save group",
      });
    }
  }

  /**
   * Force refresh the device cache
   */
  async handleRefreshState(): Promise<void> {
    try {
      if (this.deviceService) {
        await this.deviceService.discover(true); // force refresh
        streamDeck.logger.info("Device cache refreshed");
      }
    } catch (error) {
      streamDeck.logger.error("Failed to refresh device cache:", error);
    }
  }

  /**
   * Handle deleteGroup from PI
   */
  async handleDeleteGroup(actionId: string, payload: JsonValue): Promise<void> {
    const data = payload as { groupId?: string };
    if (!data.groupId) return;

    try {
      const apiKey = await globalSettingsService.getApiKey();
      await this.ensureServices(apiKey);

      if (!this.groupService) throw new Error("Group service unavailable");

      // Strip group: prefix if present
      const groupId = data.groupId.startsWith("group:")
        ? data.groupId.substring(6)
        : data.groupId;
      await this.groupService.deleteGroup(groupId);

      await sendToPI(actionId, {
        event: "groupDeleted",
        success: true,
      });
    } catch (error) {
      streamDeck.logger.error("Failed to delete group:", error);
      await sendToPI(actionId, {
        event: "groupDeleted",
        success: false,
        error: "Failed to delete group",
      });
    }
  }

  /**
   * Throttled control for dial actions.
   * Accumulates rapid changes and only sends the final value after a delay.
   * Key = action context ID to support multiple dials independently.
   */
  private dialTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private dialPending = new Map<string, () => Promise<void>>();

  async controlTargetThrottled(
    contextId: string,
    target: DeviceTarget,
    command: "on" | "off" | "brightness" | "color" | "colorTemperature",
    value?: Brightness | ColorRgb | ColorTemperature,
    delayMs = 200,
  ): Promise<void> {
    // Cancel any pending send for this context
    const existingTimer = this.dialTimers.get(contextId);
    if (existingTimer) clearTimeout(existingTimer);

    // Queue the latest value
    const sendFn = async () => {
      this.dialTimers.delete(contextId);
      this.dialPending.delete(contextId);
      await this.controlTarget(target, command, value);
    };

    this.dialPending.set(contextId, sendFn);
    this.dialTimers.set(
      contextId,
      setTimeout(() => {
        const fn = this.dialPending.get(contextId);
        if (fn)
          fn().catch((e) =>
            streamDeck.logger.error("Throttled control failed:", e),
          );
      }, delayMs),
    );
  }

  /**
   * Clean up throttle timers for a specific context (call from onWillDisappear).
   */
  cleanupThrottleTimers(contextId: string): void {
    const timer = this.dialTimers.get(contextId);
    if (timer) clearTimeout(timer);
    this.dialTimers.delete(contextId);
    this.dialPending.delete(contextId);
  }

  /**
   * Show a spinner on a key while an async operation runs.
   * Returns a function to stop the spinner.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showSpinner(action: any, label?: string): () => void {
    const frames = ["◐", "◓", "◑", "◒"];
    let i = 0;
    let stopped = false;
    const interval = setInterval(() => {
      if (stopped) return;
      const text = label ? `${frames[i]}\n${label}` : frames[i];
      action.setTitle(text).catch(() => {});
      i = (i + 1) % frames.length;
    }, 150);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }

  /**
   * Execute a control command on either a light or group
   * Includes retry logic with exponential backoff for resilience
   */
  async controlTarget(
    target: DeviceTarget,
    command: "on" | "off" | "brightness" | "color" | "colorTemperature",
    value?: Brightness | ColorRgb | ColorTemperature,
    maxRetries = 3,
  ): Promise<void> {
    if (!this.lightControlService) {
      throw new Error("Light control service not initialized");
    }

    const execute = async (attempt: number): Promise<void> => {
      try {
        if (target.type === "light" && target.light) {
          await this.lightControlService!.controlLight(
            target.light,
            command,
            value,
          );
        } else if (target.type === "group" && target.group) {
          await this.lightControlService!.controlGroup(
            target.group,
            command,
            value,
          );
        }
      } catch (error) {
        // Don't retry on validation errors - these are likely API issues
        if (this.isValidationError(error)) {
          throw error;
        }
        if (attempt < maxRetries) {
          const delay = Math.min(100 * Math.pow(2, attempt), 1000);
          streamDeck.logger?.warn(
            `Command failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`,
            error,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return execute(attempt + 1);
        }
        throw error;
      }
    };

    await execute(0);
  }

  private isValidationError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.constructor.name === "ValidationError" ||
        error.message.includes("API response validation failed"))
    );
  }

  /**
   * Apply per-segment colors to a single light (RGB IC lights only).
   */
  async setSegmentColors(
    light: Light,
    segments: SegmentColor[],
  ): Promise<void> {
    if (!this.lightRepository) {
      throw new Error("Light repository not initialized");
    }
    await this.lightRepository.setSegmentColors(light, segments);
  }

  async getDynamicScenes(light: Light): Promise<LightScene[]> {
    if (!this.lightRepository) {
      throw new Error("Light repository not initialized");
    }
    return this.lightRepository.getDynamicScenes(light);
  }

  async applyDynamicScene(light: Light, scene: LightScene): Promise<void> {
    if (!this.lightRepository) {
      throw new Error("Light repository not initialized");
    }
    await this.lightRepository.setLightScene(light, scene);
  }

  async toggleFeatureRaw(
    light: Light,
    instance: string,
    enabled: boolean,
  ): Promise<void> {
    if (!this.lightRepository) {
      throw new Error("Light repository not initialized");
    }
    await this.lightRepository.toggleRaw(light, instance, enabled);
  }

  async applyMusicModeRaw(light: Light, musicMode: MusicMode): Promise<void> {
    if (!this.lightRepository) {
      throw new Error("Light repository not initialized");
    }
    await this.lightRepository.setMusicModeRaw(light, musicMode);
  }

  async getMusicModes(
    deviceId: string,
  ): Promise<Array<{ name: string; value: number }>> {
    if (!this.lightRepository) {
      throw new Error("Light repository not initialized");
    }
    return this.lightRepository.getMusicModes(deviceId);
  }

  async getToggleFeatures(
    deviceId: string,
  ): Promise<Array<{ name: string; instance: string }>> {
    if (!this.lightRepository) {
      throw new Error("Light repository not initialized");
    }
    return this.lightRepository.getToggleFeatures(deviceId);
  }
}
