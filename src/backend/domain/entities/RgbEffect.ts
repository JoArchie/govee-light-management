import { EffectFrame, EffectFrameJSON } from "../value-objects/EffectFrame";

export enum LoopMode {
  Once = "once",
  Loop = "loop",
}

export interface RgbEffectJSON {
  id: string;
  name: string;
  frames: EffectFrameJSON[];
  loopMode: LoopMode;
}

export interface RgbEffectProps {
  id: string;
  name: string;
  frames: EffectFrame[];
  loopMode?: LoopMode;
}

/**
 * Entity representing a custom RGB animation effect.
 * Contains a sequence of EffectFrames played at their specified timings.
 */
export class RgbEffect {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly frames: readonly EffectFrame[],
    public readonly loopMode: LoopMode,
  ) {}

  static create(props: RgbEffectProps): RgbEffect {
    if (!props.id || props.id.trim() === "") {
      throw new Error("ID cannot be empty");
    }
    if (!props.name || props.name.trim() === "") {
      throw new Error("Name cannot be empty");
    }
    if (props.frames.length === 0) {
      throw new Error("Effect must have at least one frame");
    }

    for (let i = 1; i < props.frames.length; i++) {
      if (props.frames[i].timingMs <= props.frames[i - 1].timingMs) {
        throw new Error("Frames must be in chronological order");
      }
    }

    return new RgbEffect(
      props.id,
      props.name,
      Object.freeze([...props.frames]),
      props.loopMode ?? LoopMode.Once,
    );
  }

  get durationMs(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1].timingMs;
  }

  toJSON(): RgbEffectJSON {
    return {
      id: this.id,
      name: this.name,
      frames: this.frames.map((f) => f.toJSON()),
      loopMode: this.loopMode,
    };
  }

  static fromJSON(json: RgbEffectJSON): RgbEffect {
    return RgbEffect.create({
      id: json.id,
      name: json.name,
      frames: json.frames.map((f) => EffectFrame.fromJSON(f)),
      loopMode: json.loopMode,
    });
  }
}
