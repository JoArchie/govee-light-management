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
 */
export class ActionServices {
  lightRepository?: GoveeLightRepository;
  lightControlService?: LightControlService;
  groupRepository?: StreamDeckLightGroupRepository;
  groupService?: LightGroupService;
  transportOrchestrator?: TransportOrchestrator;
  deviceService?: DeviceService;
  private currentApiKey?: string;

  async ensureServices(apiKey?: string): Promise<void> {
    if (!this.groupRepository) {
      this.groupRepository = new StreamDeckLightGroupRepository();
    }

    if (apiKey && apiKey !== this.currentApiKey) {
      this.lightRepository = new GoveeLightRepository(apiKey, true);
      this.lightControlService = new LightControlService(this.lightRepository);
      this.groupService = new LightGroupService(
        this.groupRepository,
        this.lightRepository,
      );
      this.currentApiKey = apiKey;

      try {
        await globalSettingsService.setApiKey(apiKey);
      } catch (error) {
        streamDeck.logger?.warn("Failed to persist API key globally", error);
      }
    }

    if (this.lightRepository && !this.lightControlService) {
      this.lightControlService = new LightControlService(this.lightRepository);
    }

    if (this.groupRepository && this.lightRepository && !this.groupService) {
      this.groupService = new LightGroupService(
        this.groupRepository,
        this.lightRepository,
      );
    }

    if (!this.transportOrchestrator) {
      const cloudTransport = new CloudTransport();
      this.transportOrchestrator = new TransportOrchestrator({
        [TransportKind.Cloud]: cloudTransport,
      });
    }

    if (this.transportOrchestrator && !this.deviceService) {
      this.deviceService = new DeviceService(this.transportOrchestrator, {
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

    if (target.type === "group" && target.groupId && this.groupService) {
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
    } catch {
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
    } catch {
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
    } catch {
      await streamDeck.ui.sendToPropertyInspector({
        event: "groupDeleted",
        success: false,
        error: "Failed to delete group",
      });
    }
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
}
