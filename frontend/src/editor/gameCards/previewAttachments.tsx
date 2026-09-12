import { useEffect, useState } from "react";
import { Group, Object3D } from "three";
import { Game } from "@/data/globals/globals";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import {
  cloneGroupForItemRendering,
  extractSubgroupByIndex,
  loadFileGltf,
} from "@/editor/threejs/hooks/itemModelLoaderUtils";

interface PreviewAttachmentDefinition {
  readonly boneName: string | null;
  readonly modelIndex: number;
  readonly name: string;
  readonly scale: number;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
}

interface LoadedPreviewAttachment extends PreviewAttachmentDefinition {
  readonly group: Group;
}

function normalizeBoneName(name: string): string {
  return name.replace(/[\s_-]/g, "").toLowerCase();
}

function findBone(scene: Object3D, boneName: string): Object3D | null {
  const normalizedTarget = normalizeBoneName(boneName);
  let match: Object3D | null = null;
  scene.traverse((object) => {
    if (!match && normalizeBoneName(object.name) === normalizedTarget) {
      match = object;
    }
  });
  return match;
}

// The preview's Brog scene is the same local frame as the in-game head
// skeleton. The original game places that head at this offset from the car.
const CRO_MAG_HEAD_OFFSET: readonly [number, number, number] = [0, 58, -10];
const CRO_MAG_CAR_POSITION: readonly [number, number, number] = [
  -CRO_MAG_HEAD_OFFSET[0],
  -CRO_MAG_HEAD_OFFSET[1],
  -CRO_MAG_HEAD_OFFSET[2],
];
const OTTO_PREVIEW_ATTACHMENT_SCALE = 0.75;

const PREVIEW_ATTACHMENTS: Partial<
  Record<Game, readonly PreviewAttachmentDefinition[]>
> = {
  [Game.OTTO_MATIC]: [
    {
      boneName: "LeftHand",
      modelIndex: 8,
      name: "Otto default pulse gun hand",
      scale: OTTO_PREVIEW_ATTACHMENT_SCALE,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
    {
      boneName: "RightHand",
      modelIndex: 5,
      name: "Otto right hand",
      scale: OTTO_PREVIEW_ATTACHMENT_SCALE,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
  ],
  [Game.BILLY_FRONTIER]: [
    {
      boneName: "Head",
      modelIndex: 0,
      name: "Billy hat",
      scale: 1.3,
      position: [0, 20, -2],
      rotation: [0.2, 0, 0],
    },
    {
      boneName: "LeftHand",
      modelIndex: 1,
      name: "Billy left gun",
      scale: 1.3,
      position: [-8, -22, -5],
      rotation: [0, 0, -0.4],
    },
    {
      boneName: "RtHand",
      modelIndex: 1,
      name: "Billy right gun",
      scale: 1.3,
      position: [8, -22, -5],
      rotation: [0, 0, 0.4],
    },
  ],
  [Game.CRO_MAG]: [
    {
      boneName: null,
      modelIndex: 0,
      name: "Cro-Mag Mammoth car body",
      scale: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
    {
      boneName: null,
      modelIndex: 10,
      name: "Cro-Mag front-left wheel",
      scale: 1,
      position: [-109, -19, -92],
      rotation: [0, 0, 0],
    },
    {
      boneName: null,
      modelIndex: 11,
      name: "Cro-Mag front-right wheel",
      scale: 1,
      position: [109, -19, -92],
      rotation: [0, 0, 0],
    },
    {
      boneName: null,
      modelIndex: 12,
      name: "Cro-Mag back-right wheel",
      scale: 1,
      position: [129, 4, 91],
      rotation: [0, 0, 0],
    },
    {
      boneName: null,
      modelIndex: 13,
      name: "Cro-Mag back-left wheel",
      scale: 1,
      position: [-129, 4, 91],
      rotation: [0, 0, 0],
    },
  ],
};

const ASSET_BASE_PATH = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

const GLOBAL_MODEL_PATH: Partial<Record<Game, string>> = {
  [Game.OTTO_MATIC]: `${ASSET_BASE_PATH}/games/ottomatic/models/global.bg3d`,
  [Game.BILLY_FRONTIER]: `${ASSET_BASE_PATH}/games/billyfrontier/models/global.bg3d`,
  [Game.CRO_MAG]: `${ASSET_BASE_PATH}/games/cromagrally/models/carparts.bg3d`,
};

function PreviewAttachmentMount({
  scene,
  attachment,
}: {
  scene: Object3D;
  attachment: LoadedPreviewAttachment;
}) {
  useEffect(() => {
    const parent = attachment.boneName
      ? findBone(scene, attachment.boneName)
      : scene;
    if (!parent) {
      console.warn(
        `Could not mount preview attachment "${attachment.name}": ` +
          `bone "${attachment.boneName ?? "scene root"}" was not found.`,
      );
      return undefined;
    }
    attachment.group.scale.setScalar(attachment.scale);
    attachment.group.position.set(...attachment.position);
    attachment.group.rotation.set(...attachment.rotation);
    attachment.group.traverse((object) => {
      object.visible = true;
      if ("isMesh" in object && object.isMesh) {
        object.frustumCulled = false;
      }
    });
    parent.add(attachment.group);
    return () => {
      parent.remove(attachment.group);
    };
  }, [scene, attachment]);

  return null;
}

function PreviewCarAssembly({
  scene,
  attachments,
}: {
  scene: Object3D;
  attachments: readonly LoadedPreviewAttachment[];
}) {
  useEffect(() => {
    const car = new Group();
    car.position.set(...CRO_MAG_CAR_POSITION);
    attachments.forEach((attachment) => {
      attachment.group.scale.setScalar(attachment.scale);
      attachment.group.position.set(...attachment.position);
      attachment.group.rotation.set(...attachment.rotation);
      attachment.group.traverse((object) => {
        object.visible = true;
        if ("isMesh" in object && object.isMesh) {
          object.frustumCulled = false;
        }
      });
      car.add(attachment.group);
    });
    scene.add(car);
    return () => {
      scene.remove(car);
    };
  }, [scene, attachments]);

  return null;
}

function loadAttachments(
  gameType: Game,
  worker: Worker,
): Promise<LoadedPreviewAttachment[]> {
  const definitions = PREVIEW_ATTACHMENTS[gameType] ?? [];
  const path = GLOBAL_MODEL_PATH[gameType];
  const url = path ? `${path}?preview-accessories-v3` : null;
  if (!url || definitions.length === 0) {
    return Promise.resolve([]);
  }

  return loadFileGltf(worker, url).then((gltf) => {
    return definitions.flatMap((definition) => {
      const subgroup = extractSubgroupByIndex(gltf, definition.modelIndex);
      if (!subgroup) {
        return [];
      }
      return [{ ...definition, group: cloneGroupForItemRendering(subgroup) }];
    });
  });
}

export function PreviewAttachments({
  gameType,
  scene,
}: {
  gameType: Game;
  scene: Object3D;
}) {
  const [attachments, setAttachments] = useState<LoadedPreviewAttachment[]>([]);
  const [attachmentsGame, setAttachmentsGame] = useState<Game | null>(null);

  useEffect(() => {
    const worker = new BG3DGltfWorker();
    let active = true;
    loadAttachments(gameType, worker)
      .then((loaded) => {
        if (active) {
          setAttachments(loaded);
          setAttachmentsGame(gameType);
        }
      })
      .catch(() => {
        if (active) {
          setAttachments([]);
          setAttachmentsGame(gameType);
        }
      });
    return () => {
      active = false;
      worker.terminate();
    };
  }, [gameType]);

  return (
    <>
      {attachmentsGame === gameType &&
        (gameType === Game.CRO_MAG ? (
          <PreviewCarAssembly scene={scene} attachments={attachments} />
        ) : (
          attachments.map((attachment) => (
            <PreviewAttachmentMount
              key={`${attachment.name}-${attachment.boneName}`}
              scene={scene}
              attachment={attachment}
            />
          ))
        ))}
    </>
  );
}
