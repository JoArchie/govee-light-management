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
import { Brightness } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";

type BrightnessDialSettings = BaseSettings & {
  stepSize?: number;
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.brightness-dial" })
export class BrightnessDialAction extends SingletonAction<BrightnessDialSettings> {
  private services = new ActionServices();
  private brightnessMap = new Map<string, number>(); // per-context brightness

  override async onWillAppear(
    ev: WillAppearEvent<BrightnessDialSettings>,
  ): Promise<void> {
    const contextId = ev.action.id;
    if (!this.brightnessMap.has(contextId))
      this.brightnessMap.set(contextId, 50);
    await this.updateDisplay(ev.action, ev.payload.settings);
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
    const contextId = ev.action.id;
    const step = settings.stepSize || 5;
    const current = this.brightnessMap.get(contextId) ?? 50;
    const next = Math.max(0, Math.min(100, current + ev.payload.ticks * step));
    this.brightnessMap.set(contextId, next);

    // Update display immediately for responsiveness
    await this.updateDisplay(ev.action, settings);

    // Throttled API call
    const apiKey = await this.services.getApiKey(settings);
    if (!apiKey || !settings.selectedDeviceId) return;
    await this.services.ensureServices(apiKey);
    const target = await this.services.resolveTarget(settings);
    if (!target) return;

    await this.services.controlTargetThrottled(
      contextId,
      target,
      "brightness",
      new Brightness(next),
    );
  }

  override async onDialDown(
    ev: DialDownEvent<BrightnessDialSettings>,
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

    // Toggle power on press
    const isOn =
      target.type === "light"
        ? target.light?.isOn
        : target.group?.getStateSummary().allOn;
    await this.services.controlTarget(target, isOn ? "off" : "on");
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, BrightnessDialSettings>,
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
    settings: BrightnessDialSettings,
  ): Promise<void> {
    const contextId = action.id || "default";
    const brightness = this.brightnessMap.get(contextId) ?? 50;
    const name = settings.selectedLightName || "Brightness";
    const shortName = name.length > 10 ? name.substring(0, 10) + "…" : name;

    await action.setTitle(`${brightness}%\n${shortName}`);
    await action.setFeedback({
      value: brightness,
      indicator: { value: brightness, opacity: 1 },
    });
  }
}
