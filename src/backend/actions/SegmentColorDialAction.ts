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
import { ColorRgb } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";
import { SegmentColor } from "../domain/value-objects/SegmentColor";

type SegmentColorDialSettings = BaseSettings & {
  segmentIndex?: number;
  stepSize?: number;
  saturation?: number;
};

@action({
  UUID: "com.felixgeelhaar.govee-light-management.segment-color-dial",
})
export class SegmentColorDialAction extends SingletonAction<SegmentColorDialSettings> {
  private services = new ActionServices();
  private hueMap = new Map<string, number>();

  override async onWillAppear(
    ev: WillAppearEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    if (!this.hueMap.has(ctx)) this.hueMap.set(ctx, 0);
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onDialRotate(
    ev: DialRotateEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;
    const ctx = ev.action.id;
    const step = settings.stepSize || 15;
    const current = this.hueMap.get(ctx) ?? 0;
    const next = (((current + ev.payload.ticks * step) % 360) + 360) % 360;
    this.hueMap.set(ctx, next);

    await this.updateDisplay(ev.action, settings);
    await this.applyToSegment(ev.action, settings, next);
  }

  override async onDialDown(
    ev: DialDownEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    const hue = this.hueMap.get(ctx) ?? 0;
    await this.applyToSegment(ev.action, ev.payload.settings, hue);
  }

  override async onTouchTap(
    ev: TouchTapEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    const hue = this.hueMap.get(ctx) ?? 0;
    await this.applyToSegment(ev.action, ev.payload.settings, hue);
  }

  private async applyToSegment(
    action: any,
    settings: SegmentColorDialSettings,
    hue: number,
  ): Promise<void> {
    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) {
      await action.showAlert();
      return;
    }
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target || target.type !== "light" || !target.light) {
      await action.showAlert();
      return;
    }

    const color = this.hsvToRgb(hue, settings.saturation ?? 100, 100);
    const segmentIndex = settings.segmentIndex ?? 0;
    try {
      await this.services.setSegmentColors(target.light, [
        SegmentColor.create(segmentIndex, color),
      ]);
    } catch {
      await action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SegmentColorDialSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;
    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices();
        break;
    }
  }

  private async updateDisplay(
    action: any,
    settings: SegmentColorDialSettings,
  ): Promise<void> {
    const ctx = action.id || "default";
    const hue = this.hueMap.get(ctx) ?? 0;
    const segmentIndex = settings.segmentIndex ?? 0;

    await action.setFeedback({
      label: `Segment ${segmentIndex}`,
      value: `${hue}°`,
      bar: { value: Math.round((hue / 360) * 100) },
    });
  }

  private hsvToRgb(h: number, s: number, v: number): ColorRgb {
    const sn = s / 100,
      vn = v / 100;
    const c = vn * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vn - c;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return new ColorRgb(
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    );
  }
}
