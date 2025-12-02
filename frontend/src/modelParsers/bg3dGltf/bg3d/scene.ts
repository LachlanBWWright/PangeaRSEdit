/**
 * Scene hierarchy conversion functions for BG3D ↔ glTF
 */

import { Node, Scene, Mesh } from "@gltf-transform/core";
import { BG3DGroup, BG3DGeometry } from "../../parseBG3D";

/**
 * Convert BG3D scene hierarchy to glTF scene
 */
export function bg3dSceneToGltf(
  bg3dGroups: BG3DGroup[],
  gltfMeshes: Mesh[],
  doc: any,
): Scene {
  const scene = doc.createScene();

  function processGroup(
    group: BG3DGroup | BG3DGeometry,
    parentNode?: Node,
  ): Node | null {
    if ("children" in group) {
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
    } else {
      // This is a BG3DGeometry - find corresponding mesh
      const geometry = group;
      const meshIndex = bg3dGroups.indexOf(geometry);
      if (meshIndex >= 0 && meshIndex < gltfMeshes.length) {
        const node = doc.createNode();
        node.setMesh(gltfMeshes[meshIndex]);
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
        return geometries[meshIndex];
      }
    }

    // This is a group node
    const group: BG3DGroup = {
      children: [],
    };

    // Process children
    const children = node.listChildren();
    for (const child of children) {
      group.children!.push(processNode(child));
    }

    return group;
  }

  // Process scene children
  const sceneChildren = scene.listChildren();
  for (const child of sceneChildren) {
    groups.push(processNode(child) as BG3DGroup);
  }

  return groups;
}

/**
 * Create glTF scene from BG3D data
 */
export function createGltfSceneFromBg3d(gltfMeshes: Mesh[], doc: any): Scene {
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
