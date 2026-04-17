import { DiyScene, LightScene } from "@felixgeelhaar/govee-api-client";

export function buildSceneItems(
  dynamicScenes: LightScene[],
  diyScenes: DiyScene[],
) {
  return [
    ...dynamicScenes.map((scene) => ({
      label: scene.name,
      value: JSON.stringify({
        kind: "dynamic",
        id: scene.id,
        paramId: scene.paramId,
        name: scene.name,
      }),
    })),
    ...diyScenes.map((scene) => ({
      label: `${scene.name} (DIY)`,
      value: JSON.stringify({
        kind: "diy",
        id: scene.id,
        paramId: scene.paramId,
        name: scene.name,
      }),
    })),
  ];
}
