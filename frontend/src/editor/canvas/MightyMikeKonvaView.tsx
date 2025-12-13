/**
 * Mighty Mike KonvaView - Specialized view for Mighty Mike's 2D tile system
 * 
 * Features:
 * - Uses 2D tilemaps (32x32 pixel tiles)
 * - No fences support
 * - No liquid/water bodies support
 * - No splines support
 * - No supertiles (direct tile mapping)
 * - Items and 2D tile grid only
 */

import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useState, useEffect, useMemo } from "react";
import { Stage, Layer, Image } from "react-konva";
import { Updater } from "use-immer";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { ShowMightyMikeCollisionOverlay } from "@/data/game/gameAtoms";
import { MightyMikeItems } from "../subviews/MightyMikeItems";
import { MightyMikeSupertiles } from "../subviews/supertiles/MightyMikeSupertiles";
import {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { View } from "../viewEnum";

export type StageData = {
  scale: number;
  x: number;
  y: number;
};

interface MightyMikeKonvaViewProps {
  headerData: HeaderData;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  backgroundImage?: HTMLCanvasElement | null;
  view: View;
  stage: StageData;
  setStage: Updater<StageData>;
}

export function MightyMikeKonvaView({
  headerData,
  itemData,
  setItemData,
  terrainData,
  mapImages,
  backgroundImage,
  stage,
  setStage,
}: MightyMikeKonvaViewProps) {
  const setSelectedItem = useSetAtom(SelectedItem);
  const clickToAddItem = useAtomValue(ClickToAddItem);
  const showCollisionOverlay = useAtomValue(ShowMightyMikeCollisionOverlay);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 3000, height: 2000 });

  // Log background image status
  useEffect(() => {
    console.log("[BACKGROUND] MightyMikeKonvaView received:", {
      backgroundImageExists: !!backgroundImage,
      backgroundImageType: backgroundImage?.constructor?.name,
      backgroundImageDimensions: backgroundImage ? `${backgroundImage.width}x${backgroundImage.height}` : 'N/A',
    });
  }, [backgroundImage]);

  // Update container size on mount and window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Non-null updater for items
  const setItemDataNotNull: Updater<ItemData> = useMemo(
    () => (updater) => {
      setItemData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setItemData],
  );

  // Debug logging
  useEffect(() => {
    console.log("MightyMikeKonvaView: Render state", {
      hasTerrainData: !!terrainData,
      hasLayr: !!terrainData?.Layr,
      mapImagesCount: mapImages.length,
      containerSize,
      shouldRenderTiles: !!terrainData?.Layr && mapImages.length > 0,
    });
  }, [terrainData, mapImages, containerSize]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={containerSize.width}
        height={containerSize.height}
      scaleX={stage.scale}
      scaleY={stage.scale}
      x={stage.x}
      y={stage.y}
      draggable={true}
      onClick={(e) => {
        if (clickToAddItem === undefined) return;
        const stage = e.target.getStage();

        const pos = stage?.getRelativePointerPosition();
        if (!pos) return;
        const x = Math.round(pos.x);
        const z = Math.round(pos.y);

        setItemDataNotNull((itemData) => {
          itemData.Itms[1000].obj.push({
            x: x,
            z: z,
            type: clickToAddItem,
            flags: 0,
            p0: 0,
            p1: 0,
            p2: 0,
            p3: 0,
          });
        });
      }}
      onDblClick={() => {
        setSelectedItem(undefined);
      }}
      onWheel={(e) => {
        e.evt.preventDefault();

        const scaleBy = 1.05;
        const stage = e.target.getStage();
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const mousePointTo = {
          x: pointerPosition.x / oldScale - stage.x() / oldScale,
          y: pointerPosition.y / oldScale - stage.y() / oldScale,
        };

        const newScale =
          e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        setStage({
          scale: newScale,
          x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
          y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
        });
      }}
    >
      {/* Background layer - rendered first (behind everything) */}
      {backgroundImage ? (
        (() => {
          console.log("[BACKGROUND] Rendering background layer");
          return (
            <Layer>
              <Image
                image={backgroundImage}
                x={0}
                y={0}
                listening={false}
              />
            </Layer>
          );
        })()
      ) : (
        (() => {
          console.log("[BACKGROUND] Not rendering background layer - backgroundImage is:", backgroundImage);
          return null;
        })()
      )}

      {/* Render 2D tile grid - Mighty Mike uses simple tile mapping, always visible */}
      {terrainData?.Layr && mapImages.length > 0 && (
        <MightyMikeSupertiles
          headerData={headerData}
          terrainData={terrainData}
          mapImages={mapImages}
          showCollisionOverlay={showCollisionOverlay}
        />
      )}

      {/* Items - shown in all views */}
      {itemData && (
        <MightyMikeItems itemData={itemData} setItemData={setItemDataNotNull} />
      )}
    </Stage>
    </div>
  );
}
