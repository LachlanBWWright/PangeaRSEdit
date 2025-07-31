import { useEffect, useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface Texture {
  name: string;
  url: string;
  type: 'diffuse' | 'normal' | 'other';
  material?: string;
  size?: { width: number; height: number };
}

interface ModelNode {
  name: string;
  type: 'mesh' | 'node' | 'group';
  visible: boolean;
  children?: ModelNode[];
  meshIndex?: number;
  nodeIndex?: number;
}

interface EnhancedModelMeshProps {
  url: string;
  nodeVisibility: Map<string, boolean>;
  onTexturesExtracted: (textures: Texture[]) => void;
  onNodesExtracted: (nodes: ModelNode[]) => void;
}

export function EnhancedModelMesh({ 
  url, 
  nodeVisibility, 
  onTexturesExtracted, 
  onNodesExtracted
}: EnhancedModelMeshProps) {
  const { scene } = useGLTF(url);
  const sceneRef = useRef<THREE.Group>(null);

  // Extract textures from the scene
  const extractTextures = useMemo(() => {
    const extractedTextures: Texture[] = [];
    const textureUrls = new Set<string>();
    
    scene.traverse((child: any) => {
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((material: any) => {
          const materialName = material.name || `Material_${extractedTextures.length}`;
          
          // Helper function to process texture
          const processTexture = (texture: any, type: 'diffuse' | 'normal' | 'other', suffix: string) => {
            if (texture && texture.image) {
              let url = '';
              
              // Handle different types of texture sources
              if (texture.image.src) {
                url = texture.image.src;
              } else if (texture.image.data) {
                // Convert data to blob URL if it's raw data
                if (texture.image.data instanceof Uint8Array || texture.image.data instanceof ArrayBuffer) {
                  const blob = new Blob([texture.image.data], { type: 'image/png' });
                  url = URL.createObjectURL(blob);
                } else {
                  url = texture.image.data;
                }
              } else if (texture.source && texture.source.uri) {
                url = texture.source.uri;
              }
              
              if (url && !textureUrls.has(url)) {
                textureUrls.add(url);
                
                // Get image dimensions
                const size = texture.image.width && texture.image.height ? 
                  { width: texture.image.width, height: texture.image.height } : undefined;
                
                console.log(`Found texture: ${materialName}_${suffix}, URL: ${url}, Size: ${size ? `${size.width}x${size.height}` : 'unknown'}`);
                
                extractedTextures.push({
                  name: `${materialName}_${suffix}`,
                  url,
                  type,
                  material: materialName,
                  size
                });
              }
            }
          };

          // Extract different texture types
          processTexture(material.map, 'diffuse', 'Diffuse');
          processTexture(material.normalMap, 'normal', 'Normal');
          processTexture(material.roughnessMap, 'other', 'Roughness');
          processTexture(material.metalnessMap, 'other', 'Metalness');
          processTexture(material.aoMap, 'other', 'AO');
          processTexture(material.emissiveMap, 'other', 'Emissive');
          processTexture(material.specularMap, 'other', 'Specular');
          processTexture(material.alphaMap, 'other', 'Alpha');
          processTexture(material.bumpMap, 'other', 'Bump');
          processTexture(material.displacementMap, 'other', 'Displacement');
        });
      }
    });

    return extractedTextures;
  }, [scene]);

  // Extract node hierarchy from the scene
  const extractNodes = useMemo(() => {
    const extractNode = (obj: THREE.Object3D, level = 0): ModelNode => {
      const node: ModelNode = {
        name: obj.name || `Node_${obj.id}`,
        type: obj instanceof THREE.Mesh ? 'mesh' : 
              obj instanceof THREE.Group ? 'group' : 'node',
        visible: obj.visible,
        children: [],
        meshIndex: obj instanceof THREE.Mesh ? obj.id : undefined,
        nodeIndex: obj.id
      };

      // Process children
      if (obj.children.length > 0) {
        node.children = obj.children.map(child => extractNode(child, level + 1));
      }

      return node;
    };

    return scene.children.map(child => extractNode(child));
  }, [scene]);

  // Update textures when scene changes
  useEffect(() => {
    onTexturesExtracted(extractTextures);
  }, [extractTextures, onTexturesExtracted]);

  // Update nodes when scene changes
  useEffect(() => {
    onNodesExtracted(extractNodes);
  }, [extractNodes, onNodesExtracted]);

  // Apply visibility changes to scene objects
  useEffect(() => {
    const updateVisibility = (obj: THREE.Object3D) => {
      const nodeKey = `${obj.id}`;
      const meshKey = obj instanceof THREE.Mesh ? `mesh_${obj.id}` : undefined;
      
      // Check visibility state
      const nodeVisible = nodeVisibility.get(nodeKey);
      const meshVisible = meshKey ? nodeVisibility.get(meshKey) : undefined;
      
      if (nodeVisible !== undefined) {
        obj.visible = nodeVisible;
      } else if (meshVisible !== undefined) {
        obj.visible = meshVisible;
      }
      
      // Recursively update children
      obj.children.forEach(updateVisibility);
    };

    scene.traverse(updateVisibility);
  }, [scene, nodeVisibility]);

  // Clone the scene to avoid mutating the original
  const clonedScene = useMemo(() => {
    return scene.clone();
  }, [scene]);

  return (
    <group ref={sceneRef}>
      <primitive object={clonedScene} position={[0, 0, 0]} scale={1} />
    </group>
  );
}