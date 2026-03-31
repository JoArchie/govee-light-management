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
import { ColorTemperature } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";
import { telemetryService } from "../services/TelemetryService";

type ColorTemperatureSettings = BaseSettings & {
  colorTempValue?: number;
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.colortemp" })
export class ColorTemperatureAction extends SingletonAction<ColorTemperatureSettings> {
  private services = new ActionServices();

  override async onWillAppear(
    ev: WillAppearEvent<ColorTemperatureSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<ColorTemperatureSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override async onKeyDown(
    ev: KeyDownEvent<ColorTemperatureSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;

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

    const started = Date.now();

    try {
      const tempPercent = settings.colorTempValue ?? 50;
      const kelvin = Math.round(2000 + (tempPercent / 100) * 7000);
      const colorTemp = new ColorTemperature(kelvin);

      const shortName = settings.selectedLightName?.substring(0, 12);
      const stopSpinner = this.services.showSpinner(ev.action, shortName);
      try {
        await this.services.controlTarget(
          target,
          "colorTemperature",
          colorTemp,
        );
      } finally {
        stopSpinner();
      }
      await ev.action.setTitle(this.getTitle(settings));

      telemetryService.recordCommand({
        command: `${target.type}.colorTemperature`,
        durationMs: Date.now() - started,
        success: true,
      });
    } catch (error) {
      streamDeck.logger.error("Failed to set color temperature:", error);
      await ev.action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, ColorTemperatureSettings>,
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

  private getTitle(settings: ColorTemperatureSettings): string {
    const name = settings.selectedLightName;
    if (!name) return "Color Temp";
    const shortName = name.length > 12 ? name.substring(0, 12) + "…" : name;
    const val = settings.colorTempValue ?? 50;
    const kelvin = Math.round(2000 + (val / 100) * 7000);
    return `${kelvin}K\n${shortName}`;
  }
}
