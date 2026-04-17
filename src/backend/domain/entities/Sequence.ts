import {
  SequenceStep,
  SequenceStepJSON,
  StepType,
} from "../value-objects/SequenceStep";

export interface SequenceJSON {
  id: string;
  name: string;
  steps: SequenceStepJSON[];
}

export interface SequenceProps {
  id: string;
  name: string;
  steps?: SequenceStep[];
}

/**
 * Entity representing a multi-step sequence of light actions and delays.
 * Immutable — all modifying operations return a new Sequence instance.
 */
export class Sequence {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly steps: readonly SequenceStep[],
  ) {}

  static create(props: SequenceProps): Sequence {
    if (!props.id || props.id.trim() === "") {
      throw new Error("ID cannot be empty");
    }
    if (!props.name || props.name.trim() === "") {
      throw new Error("Name cannot be empty");
    }
    return new Sequence(
      props.id,
      props.name,
      Object.freeze([...(props.steps ?? [])]),
    );
  }

  addStep(step: SequenceStep): Sequence {
    return new Sequence(
      this.id,
      this.name,
      Object.freeze([...this.steps, step]),
    );
  }

  removeStep(index: number): Sequence {
    if (index < 0 || index >= this.steps.length) {
      throw new Error("Index out of bounds");
    }
    const next = this.steps.filter((_, i) => i !== index);
    return new Sequence(this.id, this.name, Object.freeze(next));
  }

  moveStep(fromIndex: number, toIndex: number): Sequence {
    if (
      fromIndex < 0 ||
      fromIndex >= this.steps.length ||
      toIndex < 0 ||
      toIndex >= this.steps.length
    ) {
      throw new Error("Index out of bounds");
    }
    const next = [...this.steps];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return new Sequence(this.id, this.name, Object.freeze(next));
  }

  clearSteps(): Sequence {
    return new Sequence(this.id, this.name, Object.freeze([]));
  }

  rename(newName: string): Sequence {
    if (!newName || newName.trim() === "") {
      throw new Error("Name cannot be empty");
    }
    return new Sequence(this.id, newName, this.steps);
  }

  /**
   * Calculate the minimum estimated duration based on delay steps.
   * Does not include action execution time (which is API-dependent).
   */
  estimatedDurationMs(): number {
    return this.steps
      .filter((s) => s.type === StepType.Delay)
      .reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  }

  toJSON(): SequenceJSON {
    return {
      id: this.id,
      name: this.name,
      steps: this.steps.map((s) => s.toJSON()),
    };
  }

  static fromJSON(json: SequenceJSON): Sequence {
    const steps = json.steps.map((s) => SequenceStep.fromJSON(s));
    return Sequence.create({ id: json.id, name: json.name, steps });
  }
}
