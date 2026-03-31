import {
  action,
  DialRotateEvent,
  DialDownEvent,
  SingletonAction,
  WillAppearEvent,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import { ColorTemperature } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";

type ColorTempDialSettings = BaseSettings & {
  stepSize?: number;
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.colortemp-dial" })
export class ColorTempDialAction extends SingletonAction<ColorTempDialSettings> {
  private services = new ActionServices();
  private tempMap = new Map<string, number>(); // per-context temp (0-100 scale)

  override async onWillAppear(
    ev: WillAppearEvent<ColorTempDialSettings>,
  ): Promise<void> {
    const contextId = ev.action.id;
    if (!this.tempMap.has(contextId)) this.tempMap.set(contextId, 50);
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<ColorTempDialSettings>,
  ): Promise<void> {
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onDialRotate(
    ev: DialRotateEvent<ColorTempDialSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const contextId = ev.action.id;
    const step = settings.stepSize || 5;
    const current = this.tempMap.get(contextId) ?? 50;
    const next = Math.max(0, Math.min(100, current + ev.payload.ticks * step));
    this.tempMap.set(contextId, next);

    await this.updateDisplay(ev.action, settings);

    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) return;
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target) return;

    // Convert 0-100 scale to 2000-9000K
    const kelvin = Math.round(2000 + (next / 100) * 7000);
    await this.services.controlTargetThrottled(
      contextId,
      target,
      "colorTemperature",
      new ColorTemperature(kelvin),
    );
  }

  override async onDialDown(
    ev: DialDownEvent<ColorTempDialSettings>,
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

    const isOn =
      target.type === "light"
        ? target.light?.isOn
        : target.group?.getStateSummary().allOn;
    await this.services.controlTarget(target, isOn ? "off" : "on");
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, ColorTempDialSettings>,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async updateDisplay(
    action: any,
    settings: ColorTempDialSettings,
  ): Promise<void> {
    const contextId = action.id || "default";
    const temp = this.tempMap.get(contextId) ?? 50;
    const kelvin = Math.round(2000 + (temp / 100) * 7000);
    const name = settings.selectedLightName || "Color Temp";
    const shortName = name.length > 10 ? name.substring(0, 10) + "…" : name;

    await action.setTitle(`${kelvin}K\n${shortName}`);
    await action.setFeedback({
      value: temp,
      indicator: { value: temp, opacity: 1 },
    });
  }
}
