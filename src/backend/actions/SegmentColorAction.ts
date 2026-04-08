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
import { ColorRgb } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";
import { SegmentColor } from "../domain/value-objects/SegmentColor";

type SegmentColorSettings = BaseSettings & {
  preset?: "rainbow" | "solid" | "gradient";
  segmentCount?: number;
  hue?: number; // used for solid
  hueStart?: number; // used for gradient
  hueEnd?: number; // used for gradient
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.segment-color" })
export class SegmentColorAction extends SingletonAction<SegmentColorSettings> {
  private services = new ActionServices();

  override async onWillAppear(
    ev: WillAppearEvent<SegmentColorSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<SegmentColorSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override async onKeyDown(
    ev: KeyDownEvent<SegmentColorSettings>,
  ): Promise<void> {
    const { settings } = ev.payload;

    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) {
      await ev.action.showAlert();
      return;
    }

    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target || target.type !== "light" || !target.light) {
      await ev.action.showAlert();
      return;
    }

    try {
      const segments = this.buildSegments(settings);
      await this.services.setSegmentColors(target.light, segments);
    } catch (error) {
      streamDeck.logger.error("Failed to set segment colors:", error);
      await ev.action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SegmentColorSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;
    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices();
        break;
    }
  }

  private buildSegments(settings: SegmentColorSettings): SegmentColor[] {
    const count = Math.max(1, Math.min(15, settings.segmentCount ?? 15));
    const preset = settings.preset ?? "rainbow";
    const segments: SegmentColor[] = [];

    for (let i = 0; i < count; i++) {
      let hue: number;
      switch (preset) {
        case "solid":
          hue = settings.hue ?? 0;
          break;
        case "gradient": {
          const start = settings.hueStart ?? 0;
          const end = settings.hueEnd ?? 360;
          hue = start + ((end - start) * i) / Math.max(1, count - 1);
          break;
        }
        case "rainbow":
        default:
          hue = (360 * i) / count;
          break;
      }
      segments.push(SegmentColor.create(i, this.hsvToRgb(hue, 100, 100)));
    }
    return segments;
  }

  private getTitle(settings: SegmentColorSettings): string {
    const preset = settings.preset ?? "rainbow";
    return preset.charAt(0).toUpperCase() + preset.slice(1);
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
