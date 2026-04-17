import { describe, expect, it, vi } from "vitest";

vi.mock("@felixgeelhaar/govee-api-client", () => {
  class MockLightScene {
    constructor(
      public readonly id: number,
      public readonly paramId: number,
      public readonly name: string,
    ) {}
  }

  class MockDiyScene {
    constructor(
      public readonly id: number,
      public readonly paramId: number,
      public readonly name: string,
    ) {}
  }

  return {
    LightScene: MockLightScene,
    DiyScene: MockDiyScene,
  };
});

import { DiyScene, LightScene } from "@felixgeelhaar/govee-api-client";
import { buildSceneItems } from "../../../src/backend/actions/scene-items";

describe("buildSceneItems", () => {
  it("merges dynamic and DIY scenes with the correct kind metadata and DIY label", () => {
    const dynamicScene = new LightScene(101, 201, "Sunset");
    const diyScene = new DiyScene(301, 301, "Custom Glow");

    expect(buildSceneItems([dynamicScene], [diyScene])).toEqual([
      {
        label: "Sunset",
        value: JSON.stringify({
          kind: "dynamic",
          id: 101,
          paramId: 201,
          name: "Sunset",
        }),
      },
      {
        label: "Custom Glow (DIY)",
        value: JSON.stringify({
          kind: "diy",
          id: 301,
          paramId: 301,
          name: "Custom Glow",
        }),
      },
    ]);
  });
});
