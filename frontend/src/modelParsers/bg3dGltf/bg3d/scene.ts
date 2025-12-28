/**
 * Scene hierarchy conversion functions for BG3D ↔ glTF
 */

import { Node, Scene, Mesh, Document } from "@gltf-transform/core";
import { BG3DGroup, BG3DGeometry } from "../../parseBG3D";

// Type guards for BG3D types
function isBG3DGroup(item: BG3DGroup | BG3DGeometry): item is BG3DGroup {
  return "children" in item;
}

function isBG3DGeometry(item: BG3DGroup | BG3DGeometry): item is BG3DGeometry {
  return !("children" in item);
}

/**
 * Convert BG3D scene hierarchy to glTF scene
 */
export function bg3dSceneToGltf(
  bg3dGroups: BG3DGroup[],
  gltfMeshes: Mesh[],
  doc: Document,
): Scene {
  const scene = doc.createScene();

  function processGroup(
    group: BG3DGroup | BG3DGeometry,
    parentNode?: Node,
  ): Node | null {
    if (isBG3DGroup(group)) {
      // This is a BG3DGroup
      const node = doc.createNode();
      node.setName("Group");

      // Process children
      if (group.children) {
        for (const child of group.children) {
          const childNode = processGroup(child, node);
          if (childNode) {
            node.addChild(childNode);
          }
        }
      }

      if (parentNode) {
        parentNode.addChild(node);
      } else {
        scene.addChild(node);
      }

      return node;
    } else if (isBG3DGeometry(group)) {
      // This is a BG3DGeometry - find corresponding mesh
      const geometry = group;
      let meshIndex = -1;
      for (let i = 0; i < bg3dGroups.length; i++) {
        const g = bg3dGroups[i];
        if (g && isBG3DGeometry(g) && g === geometry) {
          meshIndex = i;
          break;
        }
      }
      if (meshIndex >= 0 && meshIndex < gltfMeshes.length) {
        const node = doc.createNode();
        const mesh = gltfMeshes[meshIndex];
        if (mesh) {
          node.setMesh(mesh);
        }
        node.setName(`Geometry_${meshIndex}`);

        if (parentNode) {
          parentNode.addChild(node);
        } else {
          scene.addChild(node);
        }

        return node;
      }
    }

    return null;
  }

  // Process all groups
  bg3dGroups.forEach((group) => {
    processGroup(group);
  });

  return scene;
}

/**
 * Convert glTF scene to BG3D groups
 */
export function gltfSceneToBg3d(
  scene: Scene,
  geometries: BG3DGeometry[],
): BG3DGroup[] {
  const groups: BG3DGroup[] = [];

  function processNode(node: Node): BG3DGroup | BG3DGeometry {
    const mesh = node.getMesh();
    if (mesh) {
      // This is a geometry node
      const meshIndex = scene.listChildren().indexOf(node);
      if (meshIndex >= 0 && meshIndex < geometries.length) {
        const geometry = geometries[meshIndex];
        if (geometry) {
          return geometry;
        }
      }
    }

    // This is a group node
    const children = node.listChildren();
    const childResults: Array<BG3DGroup | BG3DGeometry> = [];
    for (const child of children) {
      childResults.push(processNode(child));
    }

    const group: BG3DGroup = {
      children: childResults,
    };

    return group;
  }

  // Process scene children
  const sceneChildren = scene.listChildren();
  for (const child of sceneChildren) {
    const result = processNode(child);
    if (isBG3DGroup(result)) {
      groups.push(result);
    }
  }

  return groups;
}

/**
 * Create glTF scene from BG3D data
 */
export function createGltfSceneFromBg3d(
  gltfMeshes: Mesh[],
  doc: Document,
): Scene {
  const scene = doc.createScene();

  // Create root node
  const rootNode = doc.createNode();
  rootNode.setName("Root");
  scene.addChild(rootNode);

  // Add all meshes as children of root
  gltfMeshes.forEach((mesh, index) => {
    const node = doc.createNode();
    node.setMesh(mesh);
    node.setName(`Mesh_${index}`);
    rootNode.addChild(node);
  });

  return scene;
}
