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
import { Brightness } from "@felixgeelhaar/govee-api-client";
import {
  ActionServices,
  type BaseSettings,
  type DeviceTarget,
} from "./shared/ActionServices";
import { telemetryService } from "../services/TelemetryService";

type BrightnessSettings = BaseSettings & {
  brightnessValue?: number;
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.brightness" })
export class BrightnessAction extends SingletonAction<BrightnessSettings> {
  private services = new ActionServices();
  private target?: DeviceTarget;

  override async onWillAppear(
    ev: WillAppearEvent<BrightnessSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const apiKey = await this.services.getApiKey(settings);
    await this.services.ensureServices(apiKey);

    this.target = (await this.services.resolveTarget(settings)) || undefined;
    await ev.action.setTitle(this.getTitle(settings));
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<BrightnessSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const apiKey = await this.services.getApiKey(settings);
    await this.services.ensureServices(apiKey);

    this.target = (await this.services.resolveTarget(settings)) || undefined;
    await ev.action.setTitle(this.getTitle(settings));
  }

  override async onKeyDown(
    ev: KeyDownEvent<BrightnessSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;

    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !this.target) {
      await ev.action.showAlert();
      return;
    }

    await this.services.ensureServices(apiKey);
    const started = Date.now();

    try {
      const brightness = new Brightness(settings.brightnessValue ?? 50);
      await this.services.controlTarget(this.target, "brightness", brightness);

      telemetryService.recordCommand({
        command: `${this.target.type}.brightness`,
        durationMs: Date.now() - started,
        success: true,
      });

      await ev.action.setTitle(this.getTitle(settings));
    } catch (error) {
      streamDeck.logger.error("Failed to set brightness:", error);
      await ev.action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, BrightnessSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;

    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices();
        break;
      case "saveGroup":
        await this.services.handleSaveGroup(ev.payload);
        break;
      case "deleteGroup":
        await this.services.handleDeleteGroup(ev.payload);
        break;
    }
  }

  private getTitle(settings: BrightnessSettings): string {
    const name = settings.selectedLightName;
    if (!name) return "Brightness";
    const shortName = name.length > 12 ? name.substring(0, 12) + "…" : name;
    const val = settings.brightnessValue ?? 50;
    return `${val}%\n${shortName}`;
  }
}
