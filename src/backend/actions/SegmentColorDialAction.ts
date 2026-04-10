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
import { ActionServices, type BaseSettings } from "./shared/ActionServices";
import { hsvToRgb } from "./shared/color-utils";
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
  private dialTimers = new Map<string, ReturnType<typeof setTimeout>>();

  override async onWillAppear(
    ev: WillAppearEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    if (!this.hueMap.has(ctx)) this.hueMap.set(ctx, 0);
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onWillDisappear(
    ev: WillDisappearEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    this.hueMap.delete(ctx);
    const timer = this.dialTimers.get(ctx);
    if (timer) clearTimeout(timer);
    this.dialTimers.delete(ctx);
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

    // Throttle API calls during rapid dial rotation
    const existingTimer = this.dialTimers.get(ctx);
    if (existingTimer) clearTimeout(existingTimer);
    this.dialTimers.set(
      ctx,
      setTimeout(() => {
        this.dialTimers.delete(ctx);
        this.applyToSegment(ev.action, settings, next);
      }, 200),
    );
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
      streamDeck.logger.warn(
        `Segment color: missing apiKey=${!!apiKey} deviceId=${settings.selectedDeviceId}`,
      );
      await action.showAlert();
      return;
    }
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target || target.type !== "light" || !target.light) {
      streamDeck.logger.warn(
        `Segment color: could not resolve target for device ${settings.selectedDeviceId}`,
      );
      await action.showAlert();
      return;
    }

    const color = hsvToRgb(hue, settings.saturation ?? 100, 100);
    const segmentIndex = settings.segmentIndex ?? 0;
    try {
      await this.services.setSegmentColors(target.light, [
        SegmentColor.create(segmentIndex, color),
      ]);
    } catch (error) {
      streamDeck.logger.error("Failed to set segment colors:", error);
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
}
