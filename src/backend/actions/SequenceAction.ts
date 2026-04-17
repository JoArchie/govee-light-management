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
import { ActionServices, type BaseSettings } from "./shared/ActionServices";
import { Sequence } from "../domain/entities/Sequence";
import {
  SequenceStep,
  SequenceStepJSON,
} from "../domain/value-objects/SequenceStep";
import { sequenceService } from "../services/SequenceService";

type SequenceSettings = BaseSettings & {
  sequenceId?: string;
  sequenceName?: string;
  steps?: SequenceStepJSON[];
};

@action({ UUID: "com.felixgeelhaar.govee-light-management.sequence" })
export class SequenceAction extends SingletonAction<SequenceSettings> {
  private services = new ActionServices();

  override async onWillAppear(
    ev: WillAppearEvent<SequenceSettings>,
  ): Promise<void> {
    await sequenceService.initialize();
    await this.refreshTitle(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<SequenceSettings>,
  ): Promise<void> {
    await this.refreshTitle(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<SequenceSettings>): Promise<void> {
    const settings = ev.payload.settings;

    if (
      !settings.sequenceId ||
      !settings.steps ||
      settings.steps.length === 0
    ) {
      await ev.action.showAlert();
      return;
    }

    const sequence = this.buildSequence(settings);
    if (!sequence) {
      await ev.action.showAlert();
      return;
    }

    if (sequenceService.isRunning(sequence.id)) {
      // Press again to cancel running sequence
      sequenceService.cancel(sequence.id);
      await ev.action.setTitle("Cancelled");
      return;
    }

    try {
      await ev.action.setTitle("▶ Running");
      await sequenceService.executeSequence(sequence);
      await ev.action.showOk();
      await this.refreshTitle(ev.action, settings);
    } catch (error) {
      streamDeck.logger?.error("Sequence execution failed:", error);
      await ev.action.showAlert();
      await this.refreshTitle(ev.action, settings);
    }
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SequenceSettings>,
  ): Promise<void> {
    if (!(ev.payload instanceof Object) || !("event" in ev.payload)) return;

    switch (ev.payload.event) {
      case "getDevices":
        await this.services.handleGetDevices(ev.action.id);
        break;
      case "getGroups":
        await this.services.handleGetGroups(ev.action.id);
        break;
      case "refreshState":
        await this.services.handleRefreshState();
        break;
    }
  }

  private buildSequence(settings: SequenceSettings): Sequence | null {
    if (!settings.sequenceId || !settings.steps) return null;
    try {
      const steps = settings.steps.map((s) => SequenceStep.fromJSON(s));
      return Sequence.create({
        id: settings.sequenceId,
        name: settings.sequenceName || "Sequence",
        steps,
      });
    } catch (error) {
      streamDeck.logger?.error("Failed to build sequence:", error);
      return null;
    }
  }

  private async refreshTitle(
    action: { setTitle: (title: string) => Promise<void> },
    settings: SequenceSettings,
  ): Promise<void> {
    const stepCount = settings.steps?.length ?? 0;
    if (stepCount === 0) {
      await action.setTitle("⚙ Empty");
    } else {
      await action.setTitle(`▶\n${stepCount} steps`);
    }
  }
}
