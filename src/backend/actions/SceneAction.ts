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
import { LightScene } from "@felixgeelhaar/govee-api-client";
import { ActionServices, type BaseSettings } from "./shared/ActionServices";

type SceneSettings = BaseSettings & {
  sceneId?: number;
  sceneParamId?: number;
  sceneName?: string;
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.scene" })
export class SceneAction extends SingletonAction<SceneSettings> {
  private services = new ActionServices();

  override async onWillAppear(
    ev: WillAppearEvent<SceneSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override onWillDisappear(_ev: WillDisappearEvent<SceneSettings>): void {
    // No state to clean up
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<SceneSettings>,
  ): Promise<void> {
    await ev.action.setTitle(this.getTitle(ev.payload.settings));
  }

  override async onKeyDown(ev: KeyDownEvent<SceneSettings>): Promise<void> {
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

    if (
      settings.sceneId == null ||
      settings.sceneParamId == null ||
      !settings.sceneName
    ) {
      streamDeck.logger.warn("Scene action: no scene selected");
      await ev.action.showAlert();
      return;
    }

    try {
      const scene = new LightScene(
        settings.sceneId,
        settings.sceneParamId,
        settings.sceneName,
      );
      const stopSpinner = this.services.showSpinner(ev.action);
      try {
        await this.services.applyDynamicScene(target.light, scene);
      } finally {
        stopSpinner();
      }
      await ev.action.showOk();
    } catch (error) {
      streamDeck.logger.error("Failed to apply scene:", error);
      await ev.action.showAlert();
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SceneSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;

    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices();
        break;
      case "getScenes":
        await this.handleGetScenes(ev.payload);
        break;
    }
  }

  private async handleGetScenes(payload: JsonValue): Promise<void> {
    const data = payload as { deviceId?: string };
    if (!data.deviceId) {
      await streamDeck.ui.sendToPropertyInspector({
        event: "scenesReceived",
        scenes: [],
      });
      return;
    }

    try {
      const apiKey = await this.services.getApiKey({});
      if (!apiKey) {
        await streamDeck.ui.sendToPropertyInspector({
          event: "scenesReceived",
          scenes: [],
        });
        return;
      }

      await this.services.ensureServices(apiKey);

      // Parse device ID (format: "light:deviceId|model")
      const lightId = data.deviceId.startsWith("light:")
        ? data.deviceId.substring(6)
        : data.deviceId;
      const [deviceId, model] = lightId.split("|");

      if (!deviceId || !model) {
        await streamDeck.ui.sendToPropertyInspector({
          event: "scenesReceived",
          scenes: [],
        });
        return;
      }

      const target = await this.services.resolveTarget({
        selectedDeviceId: data.deviceId,
        selectedModel: model,
      });

      if (!target || target.type !== "light" || !target.light) {
        await streamDeck.ui.sendToPropertyInspector({
          event: "scenesReceived",
          scenes: [],
        });
        return;
      }

      const scenes = await this.services.getDynamicScenes(target.light);
      await streamDeck.ui.sendToPropertyInspector({
        event: "scenesReceived",
        scenes: scenes.map((s) => ({
          id: s.id,
          paramId: s.paramId,
          name: s.name,
        })),
      });
    } catch (error) {
      streamDeck.logger.error("Failed to fetch scenes:", error);
      await streamDeck.ui.sendToPropertyInspector({
        event: "scenesReceived",
        scenes: [],
      });
    }
  }

  private getTitle(settings: SceneSettings): string {
    return settings.sceneName || "";
  }
}
