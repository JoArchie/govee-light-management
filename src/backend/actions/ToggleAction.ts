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

type ToggleSettings = BaseSettings & {
  selectedFeature?: string; // JSON: { name, instance }
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

    if (!settings.selectedFeature) {
      streamDeck.logger.warn("Toggle action: no feature selected");
      await ev.action.showAlert();
      return;
    }

    const parsed = JSON.parse(settings.selectedFeature) as {
      name: string;
      instance: string;
    };
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
        await this.services.toggleFeatureRaw(
          target.light,
          parsed.instance,
          enabled,
        );
      } finally {
        stopSpinner();
      }
      this.featureState.set(ctx, enabled);
      await ev.action.setTitle(this.getTitle(settings, ctx));
      await ev.action.showOk();
    } catch (error) {
      streamDeck.logger.error(`Failed to toggle ${parsed.name}:`, error);
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
      case "getToggleFeatures": {
        const settings = await ev.action.getSettings();
        await this.handleGetToggleFeatures(settings);
        break;
      }
    }
  }

  private async handleGetToggleFeatures(
    settings: ToggleSettings,
  ): Promise<void> {
    const deviceId = settings.selectedDeviceId;
    if (!deviceId) {
      await streamDeck.ui.sendToPropertyInspector({
        event: "getToggleFeatures",
        items: [],
      });
      return;
    }

    try {
      const apiKey = await this.services.getApiKey(settings);
      if (!apiKey) {
        await streamDeck.ui.sendToPropertyInspector({
          event: "getToggleFeatures",
          items: [],
        });
        return;
      }

      await this.services.ensureServices(apiKey);
      const features = await this.services.getToggleFeatures(deviceId);
      await streamDeck.ui.sendToPropertyInspector({
        event: "getToggleFeatures",
        items: features.map((f) => ({
          label: f.name,
          value: JSON.stringify({ name: f.name, instance: f.instance }),
        })),
      });
    } catch (error) {
      streamDeck.logger.error("Failed to fetch toggle features:", error);
      await streamDeck.ui.sendToPropertyInspector({
        event: "getToggleFeatures",
        items: [],
      });
    }
  }

  private getTitle(settings: ToggleSettings, contextId: string): string {
    let label = "Toggle";
    if (settings.selectedFeature) {
      try {
        const parsed = JSON.parse(settings.selectedFeature);
        label = parsed.name || "Toggle";
      } catch {
        /* ignore */
      }
    }

    const operation = settings.operation ?? "toggle";
    if (operation === "toggle") {
      const isOn = this.featureState.get(contextId) ?? false;
      return `${label}\n${isOn ? "●" : "○"}`;
    }
    return label;
  }
}
