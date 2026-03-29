import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
  streamDeck,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import {
  ActionServices,
  type BaseSettings,
  type DeviceTarget,
} from "./shared/ActionServices";
import { telemetryService } from "../services/TelemetryService";

type OnOffSettings = BaseSettings & {
  operation?: "toggle" | "on" | "off";
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.lights" })
export class OnOffAction extends SingletonAction<OnOffSettings> {
  private services = new ActionServices();
  private target?: DeviceTarget;

  override async onWillAppear(
    ev: WillAppearEvent<OnOffSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const apiKey = await this.services.getApiKey(settings);
    await this.services.ensureServices(apiKey);

    this.target = (await this.services.resolveTarget(settings)) || undefined;
    await ev.action.setTitle(this.getTitle(settings));
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<OnOffSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const apiKey = await this.services.getApiKey(settings);
    await this.services.ensureServices(apiKey);

    this.target = (await this.services.resolveTarget(settings)) || undefined;
    await ev.action.setTitle(this.getTitle(settings));
  }

  override async onKeyDown(ev: KeyDownEvent<OnOffSettings>): Promise<void> {
    const { settings } = ev.payload;

    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !this.target) {
      await ev.action.showAlert();
      return;
    }

    await this.services.ensureServices(apiKey);

    const operation = settings.operation || "toggle";
    const started = Date.now();

    try {
      if (operation === "toggle") {
        const isOn =
          this.target.type === "light"
            ? this.target.light?.isOn
            : this.target.group?.getStateSummary().allOn;
        const cmd = isOn ? "off" : "on";
        await this.services.controlTarget(this.target, cmd);
      } else {
        await this.services.controlTarget(this.target, operation);
      }

      telemetryService.recordCommand({
        command: `${this.target.type}.${operation}`,
        durationMs: Date.now() - started,
        success: true,
      });

      await ev.action.setTitle(this.getTitle(settings));
    } catch (error) {
      streamDeck.logger.error("Failed to control:", error);
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
    }
  }

  private getTitle(settings: OnOffSettings): string {
    const name = settings.selectedLightName || "Configure";
    const shortName = name.length > 12 ? name.substring(0, 12) + "…" : name;
    const op = settings.operation || "toggle";
    const label = op === "toggle" ? "Toggle" : op === "on" ? "On" : "Off";
    return settings.selectedLightName ? `${label}\n${shortName}` : "On / Off";
  }
}
