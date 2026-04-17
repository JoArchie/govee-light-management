import { streamDeck } from "@elgato/streamdeck";
import { ScheduleService } from "../domain/services/ScheduleService";
import { ScheduledAction } from "../domain/entities/ScheduledAction";

export type ScheduleHandler = (action: ScheduledAction) => Promise<void>;

export interface SchedulerEngineOptions {
  /** How often to poll for due actions (default: 30 seconds) */
  pollIntervalMs?: number;
}

/**
 * Infrastructure-level scheduler that periodically polls the ScheduleService
 * for due actions and dispatches them to a handler callback.
 *
 * Uses polling rather than individual setTimeouts for simplicity and
 * reliability across schedule updates and plugin restarts.
 */
export class SchedulerEngine {
  private timer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private firedOneTimeIds = new Set<string>();

  constructor(
    private readonly service: ScheduleService,
    private readonly handler: ScheduleHandler,
    options: SchedulerEngineOptions = {},
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 30_000;
  }

  /**
   * Start the scheduler. Idempotent — safe to call multiple times.
   */
  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
  }

  /**
   * Stop the scheduler. Safe to call when not running.
   */
  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  /**
   * Check for due actions and fire their handlers.
   * Called internally by the polling loop, but exposed for testing/manual triggering.
   */
  private async tick(): Promise<void> {
    const due = this.service.getDueActions();
    for (const action of due) {
      // Skip if already fired (one-time actions)
      if (this.firedOneTimeIds.has(action.id)) continue;

      try {
        await this.handler(action);
      } catch (error) {
        streamDeck.logger?.error(
          `Schedule handler failed for action ${action.id}:`,
          error,
        );
      }

      // Mark one-time actions as fired to prevent re-triggering
      if (
        action.schedule.type === "one-time" ||
        action.schedule.type === "delay"
      ) {
        this.firedOneTimeIds.add(action.id);
        this.service.update(action.withSchedule(action.schedule.markFired()));
      }
    }
  }
}
