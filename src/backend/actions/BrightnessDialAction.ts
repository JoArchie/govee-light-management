import {
  action,
  DialRotateEvent,
  DialDownEvent,
  TouchTapEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
  streamDeck,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import { Brightness } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";

type BrightnessDialSettings = BaseSettings & {
  stepSize?: number;
};

/** Default bar colors from layouts/brightness.json */
const DEFAULT_BAR_FILL = "0:#7B2CBF,1:#3A86FF"; // purple→blue gradient
const DEFAULT_BAR_BG = "#1F2937"; // dark gray

@action({ UUID: "com.felixgeelhaar.govee-light-management.brightness-dial" })
export class BrightnessDialAction extends SingletonAction<BrightnessDialSettings> {
  private services = new ActionServices();
  private brightnessMap = new Map<string, number>();
  private powerMap = new Map<string, boolean>();

  override async onWillAppear(
    ev: WillAppearEvent<BrightnessDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    if (!this.brightnessMap.has(ctx)) this.brightnessMap.set(ctx, 50);
    if (!this.powerMap.has(ctx)) this.powerMap.set(ctx, true);
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onWillDisappear(
    ev: WillDisappearEvent<BrightnessDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    this.brightnessMap.delete(ctx);
    this.powerMap.delete(ctx);
    this.services.cleanupDialTimers(ctx);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<BrightnessDialSettings>,
  ): Promise<void> {
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onDialRotate(
    ev: DialRotateEvent<BrightnessDialSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const ctx = ev.action.id;
    const step = settings.stepSize || 5;
    const current = this.brightnessMap.get(ctx) ?? 50;
    const next = Math.max(0, Math.min(100, current + ev.payload.ticks * step));
    this.brightnessMap.set(ctx, next);

    // Update display instantly — defer all API work until dial stops
    await this.updateDisplay(ev.action, settings);

    this.services.deferDialAction(
      ctx,
      async () => {
        const apiKey = await this.services.getApiKey(settings);
        if (!apiKey || !settings.selectedDeviceId) return;
        await this.services.ensureServices(apiKey);
        const target = await this.services.resolveTarget(settings);
        if (!target) return;
        // Read latest accumulated value at execution time
        const finalValue = this.brightnessMap.get(ctx) ?? next;
        await this.services.controlTarget(
          target,
          "brightness",
          new Brightness(finalValue),
        );
      },
      undefined,
      {
        action: ev.action,
        restoreFillColor: DEFAULT_BAR_FILL,
        restoreBgColor: DEFAULT_BAR_BG,
      },
    );
  }

  override async onDialDown(
    ev: DialDownEvent<BrightnessDialSettings>,
  ): Promise<void> {
    await this.togglePower(ev.action, ev.payload.settings);
  }

  override async onTouchTap(
    ev: TouchTapEvent<BrightnessDialSettings>,
  ): Promise<void> {
    await this.togglePower(ev.action, ev.payload.settings);
  }

  private async togglePower(
    action: any,
    settings: BrightnessDialSettings,
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

    try {
      const isOn = this.powerMap.get(ctx) ?? true;
      this.powerMap.set(ctx, !isOn);
      await this.services.controlTarget(target, isOn ? "off" : "on");
      await this.updateDisplay(action, settings);
    } catch (error) {
      streamDeck.logger.error("Failed to toggle power:", error);
      const isOn = this.powerMap.get(ctx) ?? true;
      this.powerMap.set(ctx, !isOn);
      await action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, BrightnessDialSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;
    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices(ev.action.id);
        break;
      case "getGroups":
        await this.services.handleGetGroups(ev.action.id);
        break;
      case "saveGroup":
        await this.services.handleSaveGroup(ev.action.id, ev.payload);
        break;
      case "deleteGroup":
        await this.services.handleDeleteGroup(ev.action.id, ev.payload);
        break;
      case "refreshState":
        await this.services.handleRefreshState();
        break;
    }
  }

  private async updateDisplay(
    action: any,
    _settings: BrightnessDialSettings,
  ): Promise<void> {
    const ctx = action.id || "default";
    const brightness = this.brightnessMap.get(ctx) ?? 50;
    const isOn = this.powerMap.get(ctx) ?? true;

    await action.setFeedback({
      label: "Brightness",
      value: isOn ? `${brightness}%` : "Off",
      bar: { value: isOn ? brightness : 0 },
    });
  }
}
