export enum StepType {
  Action = "action",
  Delay = "delay",
}

export type StepTarget = "light" | "group";

export type StepCommand =
  | "on"
  | "off"
  | "toggle"
  | "brightness"
  | "color"
  | "colorTemperature";

export interface ActionStepProps {
  targetId: string;
  targetType: StepTarget;
  command: StepCommand;
  commandValue?: number | string;
}

export interface SequenceStepJSON {
  type: StepType;
  targetId?: string;
  targetType?: StepTarget;
  command?: StepCommand;
  commandValue?: number | string;
  durationMs?: number;
}

/**
 * Immutable sequence step value object.
 * Represents either a light action or a timing delay.
 */
export class SequenceStep {
  private constructor(
    public readonly type: StepType,
    private readonly data: {
      targetId?: string;
      targetType?: StepTarget;
      command?: StepCommand;
      commandValue?: number | string;
      durationMs?: number;
    },
  ) {}

  // ─── Factory Methods ─────────────────────────────────────

  static action(props: ActionStepProps): SequenceStep {
    if (!props.targetId || props.targetId.trim() === "") {
      throw new Error("Target ID cannot be empty");
    }
    return new SequenceStep(StepType.Action, {
      targetId: props.targetId,
      targetType: props.targetType,
      command: props.command,
      commandValue: props.commandValue,
    });
  }

  static delay(durationMs: number): SequenceStep {
    if (durationMs <= 0) {
      throw new Error("Delay duration must be positive");
    }
    if (durationMs > 300_000) {
      throw new Error("Delay duration must be 5 minutes or less");
    }
    return new SequenceStep(StepType.Delay, { durationMs });
  }

  // ─── Action Step Properties ──────────────────────────────

  get targetId(): string | undefined {
    return this.data.targetId;
  }

  get targetType(): StepTarget | undefined {
    return this.data.targetType;
  }

  get command(): StepCommand | undefined {
    return this.data.command;
  }

  get commandValue(): number | string | undefined {
    return this.data.commandValue;
  }

  // ─── Delay Step Properties ───────────────────────────────

  get durationMs(): number | undefined {
    return this.data.durationMs;
  }

  // ─── Serialization ───────────────────────────────────────

  toJSON(): SequenceStepJSON {
    return {
      type: this.type,
      targetId: this.data.targetId,
      targetType: this.data.targetType,
      command: this.data.command,
      commandValue: this.data.commandValue,
      durationMs: this.data.durationMs,
    };
  }

  static fromJSON(json: SequenceStepJSON): SequenceStep {
    if (json.type === StepType.Action) {
      return SequenceStep.action({
        targetId: json.targetId!,
        targetType: json.targetType!,
        command: json.command!,
        commandValue: json.commandValue,
      });
    }
    return SequenceStep.delay(json.durationMs!);
  }
}
