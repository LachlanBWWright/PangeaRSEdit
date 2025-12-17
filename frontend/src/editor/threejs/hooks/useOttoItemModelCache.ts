/**
 * Hook for lazy-loading and caching Otto Matic item 3D models
 *
 * Features:
 * - Lazy loads models only for item types present in the current level
 * - Caches converted glTF models in memory for reuse
 * - Uses Web Worker to convert BG3D → glTF off main thread
 * - Extracts specific meshes from multi-geometry BG3D files
 * - Gracefully handles loading errors with fallback behavior
 */

import { useState, useRef, useCallback } from "react";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import { getItemModelMapping } from "@/data/items/ottoItemModelMapping";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type GLTF = any;

interface CachedModel {
  gltf: GLTF | null;
  loading: boolean;
  error?: Error;
}

interface UseOttoItemModelCacheReturn {
  modelCache: Map<number, CachedModel>;
  loadModel: (itemType: number) => Promise<GLTF | null>;
  isLoading: (itemType: number) => boolean;
  hasError: (itemType: number) => boolean;
}

/**
 * Hook for managing Otto Matic item model loading and caching
 */
export const useOttoItemModelCache = (): UseOttoItemModelCacheReturn => {
  const [modelCache, setModelCache] = useState<Map<number, CachedModel>>(
    new Map(),
  );
  const workerRef = useRef<Worker | null>(null);

  /**
   * Initialize worker if needed
   */
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new BG3DGltfWorker();
    }
    return workerRef.current;
  }, []);

  /**
   * Extract specific model from glTF scene by index
   *
   * Otto Matic BG3D files have structure:
   * - gltf.scene.children[0] is the groups container
   * - gltf.scene.children[0].children[N] is the model at index N
   * - gltf.materials contains all materials with textures
   */
  const extractSubgroupByIndex = useCallback(
    (gltf: GLTF, modelIndex: number): GLTF | null => {
      try {
        // Get the groups container (first child of scene)
        const groupsContainer =
          gltf.scene.children && gltf.scene.children.length > 0
            ? gltf.scene.children[0]
            : null;

        if (!groupsContainer) {
          console.warn(
            `Could not find groups container. Scene has ${gltf.scene.children?.length || 0} children`,
          );
          return null;
        }


        // Validate model index
        if (modelIndex >= groupsContainer.children.length) {
          console.warn(
            `Model index ${modelIndex} out of range (max ${groupsContainer.children.length - 1})`,
          );
          return null;
        }

        // Get the model at the specified index
        const targetModel = groupsContainer.children[modelIndex];

        // Clone the model preserving all geometry and materials
        const clonedModel = targetModel.clone(true);

        // Create new scene with the extracted model
        const newScene = new THREE.Scene();
        newScene.add(clonedModel);

        // Return new gltf with extracted scene, keeping materials reference
        return { ...gltf, scene: newScene };
      } catch (error) {
        console.error(`Error in extractSubgroupByIndex:`, error);
        return null;
      }
    },
    [],
  );

  /**
   * Load a 3D model for an item type
   * Uses lazy loading - only fetches when called
   */
  const loadModel = useCallback(
    async (itemType: number): Promise<GLTF | null> => {
      // Check if already cached with no error
      if (modelCache.has(itemType)) {
        const cached = modelCache.get(itemType);
        if (!cached?.loading && !cached?.error) {
          return cached?.gltf || null;
        }
        if (cached?.loading) {
          // Already loading, wait a bit and return
          return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              const updated = modelCache.get(itemType);
              if (!updated?.loading) {
                clearInterval(checkInterval);
                resolve(updated?.gltf || null);
              }
            }, 100);
          });
        }
        if (cached?.error) {
          return null; // Already tried and failed
        }
      }

      // Get mapping for this item type
      const mapping = getItemModelMapping(itemType);
      if (!mapping) {
        // No mapping, item will use colored cube fallback
        return null;
      }

      // Mark as loading
      setModelCache((prev) => {
        const updated = new Map(prev);
        updated.set(itemType, { gltf: null, loading: true });
        return updated;
      });

      try {
        // Build URLs
        const baseUrl = `/PangeaRSEdit/games/ottomatic`;
        const bg3dUrl = `${baseUrl}/${mapping.modelPath}/${mapping.modelFile}`;

        // Fetch BG3D file
        const response = await fetch(bg3dUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch BG3D file: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();

        // Convert via worker (no skeleton data - static poses only)
        const glbArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const worker = getWorker();
          let resolved = false;

          const handleMessage = (e: MessageEvent) => {
            // Worker responds with type "bg3d-with-skeleton-to-glb" and result property
            if (e.data.type === "bg3d-with-skeleton-to-glb" && e.data.result) {
              resolved = true;
              worker.removeEventListener("message", handleMessage);
              worker.removeEventListener("error", handleError);
              resolve(e.data.result);
            } else if (e.data.type === "error") {
              resolved = true;
              worker.removeEventListener("message", handleMessage);
              worker.removeEventListener("error", handleError);
              reject(new Error(`Worker error: ${e.data.error}`));
            }
          };

          const handleError = (error: ErrorEvent) => {
            if (!resolved) {
              resolved = true;
              worker.removeEventListener("message", handleMessage);
              worker.removeEventListener("error", handleError);
              reject(
                new Error(`Worker error: ${error.message || "Unknown error"}`),
              );
            }
          };

          worker.addEventListener("message", handleMessage);
          worker.addEventListener("error", handleError);

          // Post message to worker (no skeleton data)
          worker.postMessage({
            type: "bg3d-with-skeleton-to-glb",
            bg3dBuffer: buffer,
            skeletonData: undefined,
          });

          // Timeout after 60 seconds for large files
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              worker.removeEventListener("message", handleMessage);
              worker.removeEventListener("error", handleError);
              reject(new Error("Model loading timeout (60s)"));
            }
          }, 60000);
        });

        // Convert ArrayBuffer to Blob
        const glbBlob = new Blob([glbArrayBuffer], { type: "model/gltf-binary" });

        // Load GLB using Three.js GLTFLoader
        const glbUrl = URL.createObjectURL(glbBlob);
        const loader = new GLTFLoader();

        const gltf = await new Promise<GLTF>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`GLTFLoader timeout for ${glbUrl}`));
          }, 30000); // 30 second timeout

          loader.load(
            glbUrl,
            (gltf: any) => {
              clearTimeout(timeoutId);
              resolve(gltf);
            },
            undefined,
            (error: any) => {
              clearTimeout(timeoutId);
              reject(new Error(`GLTFLoader error: ${error.message}`));
            }
          );
        });

        // Revoke URL after loading
        URL.revokeObjectURL(glbUrl);

        // Extract the specific model for this item type
        let finalGltf = gltf;
        if (mapping.modelIndex !== undefined) {
          const extracted = extractSubgroupByIndex(gltf, mapping.modelIndex);
          if (extracted) {
            finalGltf = extracted;
          } else {
            // Extraction failed - don't use full scene, return error
            throw new Error(
              `Failed to extract model index ${mapping.modelIndex} from ${mapping.modelFile}`,
            );
          }
        }

        // Cache the result
        setModelCache((prev) => {
          const updated = new Map(prev);
          updated.set(itemType, { gltf: finalGltf, loading: false });
          return updated;
        });

        return finalGltf;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Cache the error
        setModelCache((prev) => {
          const updated = new Map(prev);
          updated.set(itemType, { gltf: null, loading: false, error: err });
          return updated;
        });

        return null;
      }
    },
    [modelCache, getWorker, extractSubgroupByIndex],
  );

  const isLoading = useCallback(
    (itemType: number) => modelCache.get(itemType)?.loading ?? false,
    [modelCache],
  );

  const hasError = useCallback(
    (itemType: number) => !!modelCache.get(itemType)?.error,
    [modelCache],
  );

  return { modelCache, loadModel, isLoading, hasError };
};
