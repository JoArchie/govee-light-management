/**
 * Shared services and utilities for all light actions.
 * Handles device/group resolution, service initialization, and
 * the getDevices datasource that returns both lights and groups.
 */
import { streamDeck } from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import { GoveeLightRepository } from "../../infrastructure/repositories/GoveeLightRepository";
import { LightControlService } from "../../domain/services/LightControlService";
import { Light } from "../../domain/entities/Light";
import { LightGroup } from "../../domain/entities/LightGroup";
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
   * Resolve the target to a Light or LightGroup instance
   */
  async resolveTarget(settings: BaseSettings): Promise<DeviceTarget | null> {
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
      this.lightRepository
    ) {
      const light = await this.lightRepository.findLight(
        target.deviceId,
        target.model,
      );
      if (light) return { type: "light", light };
    }

    return null;
  }

  /**
   * Handle getGroups - returns group list for group manager UI
   */
  async handleGetGroups(): Promise<void> {
    try {
      const apiKey = await globalSettingsService.getApiKey();
      if (!apiKey) {
        await streamDeck.ui.sendToPropertyInspector({
          event: "groupsReceived",
          groups: [],
        });
        return;
      }
      await this.ensureServices(apiKey);
      if (!this.groupService) {
        await streamDeck.ui.sendToPropertyInspector({
          event: "groupsReceived",
          groups: [],
        });
        return;
      }
      const groups = await this.groupService.getAllGroups();
      await streamDeck.ui.sendToPropertyInspector({
        event: "groupsReceived",
        groups: groups.map((g) => ({ id: g.id, name: g.name, size: g.size })),
      });
    } catch (error) {
      streamDeck.logger.error("Failed to fetch groups:", error);
      await streamDeck.ui.sendToPropertyInspector({
        event: "groupsReceived",
        groups: [],
      });
    }
  }

  /**
   * Handle getDevices SDPI datasource - returns both lights and groups
   */
  async handleGetDevices(): Promise<void> {
    try {
      const apiKey = await globalSettingsService.getApiKey();
      if (!apiKey) {
        await streamDeck.ui.sendToPropertyInspector({
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

      // Add lights
      if (this.deviceService) {
        const lights = await this.deviceService.discover(true);
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

      await streamDeck.ui.sendToPropertyInspector({
        event: "getDevices",
        items,
      });
    } catch (error) {
      streamDeck.logger.error("Failed to fetch devices:", error);
      await streamDeck.ui.sendToPropertyInspector({
        event: "getDevices",
        items: [],
      });
    }
  }

  /**
   * Handle saveGroup from PI
   */
  async handleSaveGroup(payload: JsonValue): Promise<void> {
    const data = payload as { group?: { name: string; lightIds: string[] } };
    const group = data.group;

    if (!group?.name || !group?.lightIds) {
      await streamDeck.ui.sendToPropertyInspector({
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

      await streamDeck.ui.sendToPropertyInspector({
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
      await streamDeck.ui.sendToPropertyInspector({
        event: "groupSaved",
        success: false,
        error: "Failed to save group",
      });
    }
  }

  /**
   * Handle deleteGroup from PI
   */
  async handleDeleteGroup(payload: JsonValue): Promise<void> {
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

      await streamDeck.ui.sendToPropertyInspector({
        event: "groupDeleted",
        success: true,
      });
    } catch (error) {
      streamDeck.logger.error("Failed to delete group:", error);
      await streamDeck.ui.sendToPropertyInspector({
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
   */
  async controlTarget(
    target: DeviceTarget,
    command: "on" | "off" | "brightness" | "color" | "colorTemperature",
    value?: Brightness | ColorRgb | ColorTemperature,
  ): Promise<void> {
    if (!this.lightControlService) {
      throw new Error("Light control service not initialized");
    }

    if (target.type === "light" && target.light) {
      await this.lightControlService.controlLight(target.light, command, value);
    } else if (target.type === "group" && target.group) {
      await this.lightControlService.controlGroup(target.group, command, value);
    }
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
