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
import { ColorRgb } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";

type ColorHueDialSettings = BaseSettings & {
  stepSize?: number;
  saturation?: number;
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.colorhue-dial" })
export class ColorHueDialAction extends SingletonAction<ColorHueDialSettings> {
  private services = new ActionServices();
  private hueMap = new Map<string, number>(); // per-context hue (0-360)

  override async onWillAppear(
    ev: WillAppearEvent<ColorHueDialSettings>,
  ): Promise<void> {
    const contextId = ev.action.id;
    if (!this.hueMap.has(contextId)) this.hueMap.set(contextId, 0);
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<ColorHueDialSettings>,
  ): Promise<void> {
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onDialRotate(
    ev: DialRotateEvent<ColorHueDialSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const contextId = ev.action.id;
    const step = settings.stepSize || 15;
    const current = this.hueMap.get(contextId) ?? 0;
    // Wrap around 0-360
    const next = (((current + ev.payload.ticks * step) % 360) + 360) % 360;
    this.hueMap.set(contextId, next);

    await this.updateDisplay(ev.action, settings);

    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) return;
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target) return;

    const color = this.hsvToRgb(next, settings.saturation ?? 100, 100);
    await this.services.controlTargetThrottled(
      contextId,
      target,
      "color",
      color,
    );
  }

  override async onDialDown(
    ev: DialDownEvent<ColorHueDialSettings>,
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
    ev: SendToPluginEvent<JsonValue, ColorHueDialSettings>,
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
    settings: ColorHueDialSettings,
  ): Promise<void> {
    const contextId = action.id || "default";
    const hue = this.hueMap.get(contextId) ?? 0;
    const name = settings.selectedLightName || "Color";
    const shortName = name.length > 10 ? name.substring(0, 10) + "…" : name;

    await action.setTitle(`${hue}°\n${shortName}`);
    await action.setFeedback({
      value: Math.round((hue / 360) * 100),
      indicator: { value: Math.round((hue / 360) * 100), opacity: 1 },
    });
  }

  /**
   * Convert HSV to ColorRgb.
   * h: 0-360, s: 0-100, v: 0-100
   */
  private hsvToRgb(h: number, s: number, v: number): ColorRgb {
    const sn = s / 100;
    const vn = v / 100;
    const c = vn * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vn - c;

    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    return new ColorRgb(
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    );
  }
}
