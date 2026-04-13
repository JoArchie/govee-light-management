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
import { ColorTemperature } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";

type ColorTempDialSettings = BaseSettings & {
  stepSize?: number;
};

/** Color temperature range in Kelvin */
const MIN_KELVIN = 2000;
const MAX_KELVIN = 9000;
const DEFAULT_KELVIN = 4500;
const DEFAULT_STEP_KELVIN = 100;

/** Default bar colors from layouts/color-temp.json (gbar) */
const DEFAULT_BAR_FILL = "#FFFFFF"; // white indicator
const DEFAULT_BAR_BG = "0:#FFB347,1:#A8D8EA"; // warm→cool gradient

@action({ UUID: "com.felixgeelhaar.govee-light-management.colortemp-dial" })
export class ColorTempDialAction extends SingletonAction<ColorTempDialSettings> {
  private services = new ActionServices();
  /** Stores current color temperature in Kelvin (2000-9000) */
  private tempMap = new Map<string, number>();
  private powerMap = new Map<string, boolean>();

  override async onWillAppear(
    ev: WillAppearEvent<ColorTempDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    if (!this.tempMap.has(ctx)) this.tempMap.set(ctx, DEFAULT_KELVIN);
    if (!this.powerMap.has(ctx)) this.powerMap.set(ctx, true);

    await this.syncLiveState(ctx, ev.payload.settings);
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onWillDisappear(
    ev: WillDisappearEvent<ColorTempDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    this.tempMap.delete(ctx);
    this.powerMap.delete(ctx);
    this.services.cleanupDialTimers(ctx);
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
    const step = settings.stepSize || DEFAULT_STEP_KELVIN;
    const current = this.tempMap.get(ctx) ?? DEFAULT_KELVIN;
    const next = Math.max(
      MIN_KELVIN,
      Math.min(MAX_KELVIN, current + ev.payload.ticks * step),
    );
    this.tempMap.set(ctx, next);

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
        const finalKelvin = this.tempMap.get(ctx) ?? next;
        await this.services.controlTarget(
          target,
          "colorTemperature",
          new ColorTemperature(finalKelvin),
        );
      },
      undefined,
      {
        action: ev.action,
        getRestoreValue: () => {
          const kelvin = this.tempMap.get(ctx) ?? DEFAULT_KELVIN;
          const isOn = this.powerMap.get(ctx) ?? true;
          const barValue = Math.round(
            ((kelvin - MIN_KELVIN) / (MAX_KELVIN - MIN_KELVIN)) * 100,
          );
          return isOn ? barValue : 0;
        },
        loadingFillColor: DEFAULT_BAR_FILL,
        loadingBgColor: "#FFFFFF",
        restoreFillColor: DEFAULT_BAR_FILL,
        restoreBgColor: DEFAULT_BAR_BG,
      },
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

    try {
      let isOn = this.powerMap.get(ctx) ?? true;
      if (target.type === "light" && target.light) {
        const liveState = await this.services.getLivePowerState(target.light);
        if (liveState !== undefined) {
          isOn = liveState;
        }
      }
      this.powerMap.set(ctx, !isOn);
      await this.services.controlTarget(target, isOn ? "off" : "on");
      if (target.type === "light" && target.light) {
        await this.services.verifyLivePowerState(target.light, !isOn);
      }
      await this.updateDisplay(action, settings);
    } catch (error) {
      streamDeck.logger.error("Failed to toggle power:", error);
      const isOn = this.powerMap.get(ctx) ?? true;
      this.powerMap.set(ctx, !isOn);
      await action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, ColorTempDialSettings>,
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

  private async syncLiveState(
    ctx: string,
    settings: ColorTempDialSettings,
  ): Promise<void> {
    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) return;

    try {
      await this.services.ensureServices(apiKey);
      const target = await this.services.resolveTarget(settings);
      if (target?.type === "light" && target.light) {
        await this.services.syncLightState(target.light);
        this.powerMap.set(ctx, target.light.isOn);
        if (target.light.colorTemperature) {
          this.tempMap.set(ctx, target.light.colorTemperature.kelvin);
        }
      }
    } catch {
      // Best effort - keep defaults
    }
  }

  private async updateDisplay(
    action: any,
    _settings: ColorTempDialSettings,
  ): Promise<void> {
    const ctx = action.id || "default";
    const kelvin = this.tempMap.get(ctx) ?? DEFAULT_KELVIN;
    const isOn = this.powerMap.get(ctx) ?? true;
    // Normalize to 0-100 for the feedback bar
    const barValue = Math.round(
      ((kelvin - MIN_KELVIN) / (MAX_KELVIN - MIN_KELVIN)) * 100,
    );

    await action.setFeedback({
      label: "Temperature",
      value: isOn ? `${kelvin}K` : "Off",
      bar: { value: isOn ? barValue : 0 },
    });
  }
}
