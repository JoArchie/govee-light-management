import { Sequence } from "../entities/Sequence";
import { SequenceStep, StepType } from "../value-objects/SequenceStep";

export type SequenceActionHandler = (step: SequenceStep) => Promise<void>;

export interface SequenceExecutorOptions {
  /** Stop immediately on first action error (default: false — errors logged but execution continues) */
  stopOnError?: boolean;
}

interface RunningSequence {
  cancelled: boolean;
  currentTimer?: NodeJS.Timeout;
  resolveDelay?: () => void;
}

/**
 * Domain service for executing sequences step-by-step.
 * Dispatches action steps to a handler and waits for delay steps.
 * Supports cancellation and configurable error behavior.
 */
export class SequenceExecutor {
  private running = new Map<string, RunningSequence>();
  private readonly stopOnError: boolean;

  constructor(
    private readonly actionHandler: SequenceActionHandler,
    options: SequenceExecutorOptions = {},
  ) {
    this.stopOnError = options.stopOnError ?? false;
  }

  /**
   * Execute a sequence. Waits between steps according to delay steps.
   * Rejects if the sequence is already running.
   */
  async execute(sequence: Sequence): Promise<void> {
    if (this.running.has(sequence.id)) {
      throw new Error(`Sequence '${sequence.id}' is already running`);
    }

    const state: RunningSequence = { cancelled: false };
    this.running.set(sequence.id, state);

    try {
      for (const step of sequence.steps) {
        if (state.cancelled) break;

        if (step.type === StepType.Delay) {
          await this.waitForDelay(state, step.durationMs ?? 0);
        } else {
          await this.executeAction(step);
        }
      }
    } finally {
      this.running.delete(sequence.id);
    }
  }

  /**
   * Cancel a running sequence. Clears any pending delay and stops further steps.
   */
  cancel(sequenceId: string): boolean {
    const state = this.running.get(sequenceId);
    if (!state) return false;

    state.cancelled = true;
    if (state.currentTimer) {
      clearTimeout(state.currentTimer);
      state.currentTimer = undefined;
    }
    if (state.resolveDelay) {
      state.resolveDelay();
      state.resolveDelay = undefined;
    }
    return true;
  }

  isRunning(sequenceId: string): boolean {
    return this.running.has(sequenceId);
  }

  private async executeAction(step: SequenceStep): Promise<void> {
    try {
      await this.actionHandler(step);
    } catch (error) {
      if (this.stopOnError) throw error;
      // Otherwise continue — error swallowed intentionally
    }
  }

  private waitForDelay(state: RunningSequence, ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (state.cancelled) {
        resolve();
        return;
      }
      state.resolveDelay = resolve;
      state.currentTimer = setTimeout(() => {
        state.currentTimer = undefined;
        state.resolveDelay = undefined;
        resolve();
      }, ms);
    });
  }
}
