import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
  streamDeck,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";

type ToggleFeature = "nightlight" | "gradient";

type ToggleSettings = BaseSettings & {
  feature?: ToggleFeature;
  operation?: "toggle" | "on" | "off";
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.toggle" })
export class ToggleAction extends SingletonAction<ToggleSettings> {
  private services = new ActionServices();
  private featureState = new Map<string, boolean>();

  override async onWillAppear(
    ev: WillAppearEvent<ToggleSettings>,
  ): Promise<void> {
    const ctx = ev.action.id;
    if (!this.featureState.has(ctx)) this.featureState.set(ctx, false);
    await ev.action.setTitle(this.getTitle(ev.payload.settings, ctx));
  }

  override onWillDisappear(ev: WillDisappearEvent<ToggleSettings>): void {
    this.featureState.delete(ev.action.id);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<ToggleSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings, ev.action.id));
  }

  override async onKeyDown(ev: KeyDownEvent<ToggleSettings>): Promise<void> {
    const { settings } = ev.payload;
    const ctx = ev.action.id;

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

    const feature = settings.feature ?? "nightlight";
    const operation = settings.operation ?? "toggle";

    let enabled: boolean;
    if (operation === "toggle") {
      enabled = !(this.featureState.get(ctx) ?? false);
    } else {
      enabled = operation === "on";
    }

    try {
      const stopSpinner = this.services.showSpinner(ev.action);
      try {
        await this.services.toggleFeature(target.light, feature, enabled);
      } finally {
        stopSpinner();
      }
      this.featureState.set(ctx, enabled);
      await ev.action.setTitle(this.getTitle(settings, ctx));
      await ev.action.showOk();
    } catch (error) {
      streamDeck.logger.error(`Failed to toggle ${feature}:`, error);
      // Revert state on failure
      if (operation === "toggle") {
        this.featureState.set(ctx, !enabled);
      }
      await ev.action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, ToggleSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;

    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices();
        break;
    }
  }

  private getTitle(settings: ToggleSettings, contextId: string): string {
    const feature = settings.feature ?? "nightlight";
    const operation = settings.operation ?? "toggle";
    const label = feature === "nightlight" ? "Night" : "Grad";

    if (operation === "toggle") {
      const isOn = this.featureState.get(contextId) ?? false;
      return `${label}\n${isOn ? "●" : "○"}`;
    }
    return label;
  }
}
