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
import {
  MusicModeConfig,
  type MusicModeType,
} from "../domain/value-objects/MusicModeConfig";

type MusicModeSettings = BaseSettings & {
  mode?: MusicModeType;
  sensitivity?: number;
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.music-mode" })
export class MusicModeAction extends SingletonAction<MusicModeSettings> {
  private services = new ActionServices();

  override async onWillAppear(
    ev: WillAppearEvent<MusicModeSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override onWillDisappear(_ev: WillDisappearEvent<MusicModeSettings>): void {
    // No state to clean up
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<MusicModeSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override async onKeyDown(ev: KeyDownEvent<MusicModeSettings>): Promise<void> {
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
      const config = MusicModeConfig.create(
        settings.sensitivity ?? 50,
        settings.mode ?? "rhythm",
        true,
      );
      const stopSpinner = this.services.showSpinner(ev.action);
      try {
        await this.services.applyMusicMode(target.light, config);
      } finally {
        stopSpinner();
      }
      await ev.action.showOk();
    } catch (error) {
      streamDeck.logger.error("Failed to set music mode:", error);
      await ev.action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, MusicModeSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;

    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices();
        break;
    }
  }

  private getTitle(settings: MusicModeSettings): string {
    const mode = settings.mode ?? "rhythm";
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }
}
