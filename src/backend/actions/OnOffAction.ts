import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
  streamDeck,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";
import { telemetryService } from "../services/TelemetryService";

type OnOffSettings = BaseSettings & {
  operation?: "toggle" | "on" | "off";
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.lights" })
export class OnOffAction extends SingletonAction<OnOffSettings> {
  private services = new ActionServices();
  // Track power state per button context for toggle
  private powerState = new Map<string, boolean>();

  override async onWillAppear(
    ev: WillAppearEvent<OnOffSettings>,
  ): Promise<void> {
    const contextId = ev.action.id;
    const settings = ev.payload.settings;

    // Try to sync power state from device
    if (!this.powerState.has(contextId)) {
      this.powerState.set(contextId, false);
      const apiKey = await this.services.getApiKey(settings);
      if (apiKey && settings.selectedDeviceId) {
        try {
          await this.services.ensureServices(apiKey);
          const target = await this.services.resolveTarget(settings);
          if (target?.type === "light" && target.light) {
            this.powerState.set(contextId, target.light.state.isOn);
          }
        } catch {
          // Best effort - keep default
        }
      }
    }

    await ev.action.setTitle(this.getTitle(settings, contextId));
  }

  override onWillDisappear(ev: WillDisappearEvent<OnOffSettings>): void {
    this.powerState.delete(ev.action.id);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<OnOffSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings, ev.action.id));
  }

  override async onKeyDown(ev: KeyDownEvent<OnOffSettings>): Promise<void> {
    const { settings } = ev.payload;
    const contextId = ev.action.id;

    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) {
      await ev.action.showAlert();
      return;
    }

    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);

    if (!target) {
      await ev.action.showAlert();
      return;
    }

    const operation = settings.operation || "toggle";
    const started = Date.now();

    try {
      let command: "on" | "off";

      if (operation === "toggle") {
        const currentlyOn = this.powerState.get(contextId) ?? false;
        command = currentlyOn ? "off" : "on";
        this.powerState.set(contextId, !currentlyOn);
      } else {
        command = operation as "on" | "off";
        this.powerState.set(contextId, command === "on");
      }

      const stopSpinner = this.services.showSpinner(ev.action);

      try {
        await this.services.controlTarget(target, command);
      } finally {
        stopSpinner();
      }

      // Update title to reflect new state
      await ev.action.setTitle(this.getTitle(settings, contextId));
      await ev.action.showOk();

      telemetryService.recordCommand({
        command: `${target.type}.${operation}`,
        durationMs: Date.now() - started,
        success: true,
      });
    } catch (error) {
      streamDeck.logger.error("Failed to toggle power:", error);
      // Revert power state on failure
      const currentlyOn = this.powerState.get(contextId) ?? false;
      this.powerState.set(contextId, !currentlyOn);
      await ev.action.setTitle(this.getTitle(settings, contextId));
      await ev.action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, OnOffSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;

    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices();
        break;
      case "getGroups":
        await this.services.handleGetGroups();
        break;
      case "saveGroup":
        await this.services.handleSaveGroup(ev.payload);
        break;
      case "deleteGroup":
        await this.services.handleDeleteGroup(ev.payload);
        break;
      case "refreshState":
        await this.services.handleRefreshState();
        break;
    }
  }

  private getTitle(_settings: OnOffSettings, contextId: string): string {
    const op = _settings.operation || "toggle";
    if (op === "toggle") {
      const isOn = this.powerState.get(contextId) ?? false;
      return isOn ? "●" : "○";
    }
    return "";
  }
}
