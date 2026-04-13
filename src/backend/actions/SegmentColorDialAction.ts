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

/** Default bar colors from layouts/segment.json (gbar) */
const DEFAULT_BAR_FILL = "#FFFFFF"; // white indicator
const DEFAULT_BAR_BG =
  "0:#FF0000,0.17:#FFFF00,0.33:#00FF00,0.5:#00FFFF,0.67:#0000FF,0.83:#FF00FF,1:#FF0000"; // rainbow

@action({
  UUID: "com.felixgeelhaar.govee-light-management.segment-color-dial",
})
export class SegmentColorDialAction extends SingletonAction<SegmentColorDialSettings> {
  private services = new ActionServices();
  private hueMap = new Map<string, number>();
  private powerMap = new Map<string, boolean>();

  override async onWillAppear(
    ev: WillAppearEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    if (!this.hueMap.has(ctx)) this.hueMap.set(ctx, 0);
    if (!this.powerMap.has(ctx)) this.powerMap.set(ctx, true);

    await this.syncLiveState(ctx, ev.payload.settings);
    await this.updateDisplay(ev.action, ev.payload.settings);
  }

  override async onWillDisappear(
    ev: WillDisappearEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    this.hueMap.delete(ctx);
    this.powerMap.delete(ctx);
    this.services.cleanupDialTimers(ctx);
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

    // Update display instantly — defer all API work until dial stops
    await this.updateDisplay(ev.action, settings);

    this.services.deferDialAction(
      ctx,
      async () => {
        // Read latest accumulated value at execution time
        const finalHue = this.hueMap.get(ctx) ?? next;
        await this.applyToSegment(ev.action, settings, finalHue);
      },
      undefined,
      {
        action: ev.action,
        getRestoreValue: () => {
          const hue = this.hueMap.get(ctx) ?? 0;
          return Math.round((hue / 360) * 100);
        },
        loadingFillColor: DEFAULT_BAR_FILL,
        loadingBgColor: "#FFFFFF",
        restoreFillColor: DEFAULT_BAR_FILL,
        restoreBgColor: DEFAULT_BAR_BG,
      },
    );
  }

  override async onDialDown(
    ev: DialDownEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    await this.togglePower(ev.action, ev.payload.settings);
  }

  override async onTouchTap(
    ev: TouchTapEvent<SegmentColorDialSettings>,
  ): Promise<void> {
    await this.togglePower(ev.action, ev.payload.settings);
  }

  private async togglePower(
    action: any,
    settings: SegmentColorDialSettings,
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
      throw new Error("Missing API key or device ID");
    }
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target || target.type !== "light" || !target.light) {
      streamDeck.logger.warn(
        `Segment color: could not resolve target for device ${settings.selectedDeviceId}`,
      );
      throw new Error("Could not resolve target device");
    }

    const color = hsvToRgb(hue, settings.saturation ?? 100, 100);
    const segmentIndex = settings.segmentIndex ?? 0;
    await this.services.setSegmentColors(target.light, [
      SegmentColor.create(segmentIndex, color),
    ]);
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SegmentColorDialSettings>,
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
    settings: SegmentColorDialSettings,
  ): Promise<void> {
    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) return;

    try {
      await this.services.ensureServices(apiKey);
      const target = await this.services.resolveTarget(settings);
      if (target?.type === "light" && target.light) {
        const isOn = await this.services.getLivePowerState(target.light);
        if (isOn !== undefined) {
          this.powerMap.set(ctx, isOn);
        }
      }
    } catch {
      // Best effort - keep defaults
    }
  }

  private async updateDisplay(
    action: any,
    settings: SegmentColorDialSettings,
  ): Promise<void> {
    const ctx = action.id || "default";
    const hue = this.hueMap.get(ctx) ?? 0;
    const isOn = this.powerMap.get(ctx) ?? true;
    const segmentIndex = settings.segmentIndex ?? 0;

    await action.setFeedback({
      label: `Segment ${segmentIndex}`,
      value: isOn ? `${hue}°` : "Off",
      bar: { value: isOn ? Math.round((hue / 360) * 100) : 0 },
    });
  }
}
