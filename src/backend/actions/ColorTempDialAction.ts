import {
  action,
  DialRotateEvent,
  DialDownEvent,
  TouchTapEvent,
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
  private tempMap = new Map<string, number>();
  private powerMap = new Map<string, boolean>();

  override async onWillAppear(
    ev: WillAppearEvent<ColorTempDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    if (!this.tempMap.has(ctx)) this.tempMap.set(ctx, 50);
    if (!this.powerMap.has(ctx)) this.powerMap.set(ctx, true);
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
    const ctx = ev.action.id;
    const step = settings.stepSize || 5;
    const current = this.tempMap.get(ctx) ?? 50;
    const next = Math.max(0, Math.min(100, current + ev.payload.ticks * step));
    this.tempMap.set(ctx, next);

    await this.updateDisplay(ev.action, settings);

    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) return;
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target) return;

    const kelvin = Math.round(2000 + (next / 100) * 7000);
    await this.services.controlTargetThrottled(
      ctx,
      target,
      "colorTemperature",
      new ColorTemperature(kelvin),
    );
  }

  override async onDialDown(
    ev: DialDownEvent<ColorTempDialSettings>,
  ): Promise<void> {
    await this.togglePower(ev.action, ev.payload.settings);
  }

  override async onTouchTap(
    ev: TouchTapEvent<ColorTempDialSettings>,
  ): Promise<void> {
    await this.togglePower(ev.action, ev.payload.settings);
  }

  private async togglePower(
    action: any,
    settings: ColorTempDialSettings,
  ): Promise<void> {
    const ctx = action.id;
    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) {
      await action.showAlert();
      return;
    }
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target) {
      await action.showAlert();
      return;
    }

    const isOn = this.powerMap.get(ctx) ?? true;
    this.powerMap.set(ctx, !isOn);
    await this.services.controlTarget(target, isOn ? "off" : "on");
    await this.updateDisplay(action, settings);
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

  private async updateDisplay(
    action: any,
    _settings: ColorTempDialSettings,
  ): Promise<void> {
    const ctx = action.id || "default";
    const temp = this.tempMap.get(ctx) ?? 50;
    const isOn = this.powerMap.get(ctx) ?? true;
    const kelvin = Math.round(2000 + (temp / 100) * 7000);

    await action.setTitle(isOn ? `${kelvin}K` : "○");
    await action.setFeedback({
      value: isOn ? temp : 0,
      indicator: { value: isOn ? temp : 0, opacity: isOn ? 1 : 0.3 },
    });
  }
}
