import { useEffect, useState } from "react";
import type { Updater } from "use-immer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { mightyMikeTileSetSchema, type MightyMikeTileAnimation, type MightyMikeTileSet } from "@/schemas/common";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";
import { MightyMikeAnimationPreview } from "./MightyMikeAnimationPreview";
import { MightyMikeAnimationTileSelect, MightyMikePaletteIndexSelect } from "./MightyMikeAnimationTileSelect";
import { MightyMikeAnimationSelect } from "./MightyMikeAnimationSelect";

interface Props {
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
  readonly mapImages: HTMLCanvasElement[];
}

function updateTileset(
  setTerrainData: Updater<TerrainData>,
  update: (tileset: MightyMikeTileSet) => MightyMikeTileSet,
): void {
  setTerrainData((draft) => {
    const parsed = mightyMikeTileSetSchema.safeParse(draft.tileset);
    if (parsed.success) draft.tileset = update(parsed.data);
  });
}

function replaceAnimationAt(
  tileset: MightyMikeTileSet,
  index: number,
  update: (animation: MightyMikeTileAnimation) => MightyMikeTileAnimation,
): MightyMikeTileSet {
  const selected = tileset.tileAnimations[index];
  if (!selected) return tileset;
  const tileAnimations = tileset.tileAnimations.map((entry, current) =>
    current === index ? update(selected) : entry,
  );
  return { ...tileset, tileAnimations, numTileAnims: tileAnimations.length };
}

export function MightyMikeTilesetDataPanel(props: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-300">
        Preparing animation editor…
      </div>
    );
  }
  return <MightyMikeTilesetWorkspace {...props} />;
}

function MightyMikeTilesetWorkspace({ terrainData, setTerrainData, mapImages }: Props) {
  const parsed = mightyMikeTileSetSchema.safeParse(terrainData.tileset);
  const [selectedAnimation, setSelectedAnimation] = useState(0);
  if (!parsed.success) return null;
  const tileset = parsed.data;
  const animation = tileset.tileAnimations[selectedAnimation];
  const palette = gMightyMikePalette.getPaletteAsRGBA();
  const tileImageIndexes = tileset.xlateTable.length > 0
    ? tileset.xlateTable
    : mapImages.map((_image, index) => index);
  const replaceAnimation = (update: (current: MightyMikeTileAnimation) => MightyMikeTileAnimation) =>
    updateTileset(setTerrainData, (current) => replaceAnimationAt(current, selectedAnimation, update));

  const setFrames = (tileNums: number[]) =>
    replaceAnimation((current) => ({ ...current, tileNums, numFrames: tileNums.length }));
  const setTransparentColors = (transparencyColors: number[]) =>
    updateTileset(setTerrainData, (current) => ({ ...current, transparencyColors, numTileXparentColors: transparencyColors.length }));

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(160px,0.8fr)_minmax(200px,1fr)_140px_minmax(250px,1.4fr)_minmax(250px,1.2fr)] overflow-hidden text-sm">
      <div className="flex min-h-0 flex-col gap-2 p-3">
        <strong>Animations</strong>
        <MightyMikeAnimationSelect
          animations={tileset.tileAnimations}
          value={selectedAnimation}
          images={mapImages}
          imageIndexes={tileImageIndexes}
          onChange={setSelectedAnimation}
        />
        <Button size="sm" onClick={() => {
          updateTileset(setTerrainData, (current) => {
            const tileAnimations = [...current.tileAnimations, { name: `Animation ${current.tileAnimations.length + 1}`.slice(0, 15), speed: 16, baseTile: 0, numFrames: 1, tileNums: [0] }];
            return { ...current, tileAnimations, numTileAnims: tileAnimations.length };
          });
          setSelectedAnimation(tileset.tileAnimations.length);
        }}>Add animation</Button>
        <Button size="sm" variant="destructive" disabled={!animation} onClick={() => {
          updateTileset(setTerrainData, (current) => {
            const tileAnimations = current.tileAnimations.filter((_entry, index) => index !== selectedAnimation);
            return { ...current, tileAnimations, numTileAnims: tileAnimations.length };
          });
          setSelectedAnimation(Math.max(0, selectedAnimation - 1));
        }}>Delete animation</Button>
      </div>

      <div className="flex flex-col gap-2 border-l border-gray-700 p-3">
        <strong>Settings</strong>
        {!animation ? <span className="text-gray-400">Select an animation.</span> : <>
          <label className="grid grid-cols-[60px_1fr] items-center gap-2"><span>Name</span><Input value={animation.name} maxLength={15} onChange={(event) => replaceAnimation((current) => ({ ...current, name: event.currentTarget.value.slice(0, 15) }))} /></label>
          <label className="grid grid-cols-[60px_1fr] items-center gap-2"><span>Speed</span><Input type="number" min={0} max={65535} value={animation.speed} onChange={(event) => {
            const speed = Number.parseInt(event.currentTarget.value, 10);
            if (Number.isInteger(speed)) replaceAnimation((current) => ({ ...current, speed: Math.max(0, Math.min(0xffff, speed)) }));
          }} /></label>
          <p className="text-xs text-gray-400">
            Counter step per game frame. Higher values animate faster. {animation.speed <= 0
              ? "0 pauses the animation."
              : `This advances about every ${Math.ceil(257 / animation.speed)} game frame(s).`}
          </p>
          <div className="flex flex-col gap-1"><span>Target tile</span><MightyMikeAnimationTileSelect value={animation.baseTile} images={mapImages} imageIndexes={tileImageIndexes} onChange={(baseTile) => replaceAnimation((current) => ({ ...current, baseTile }))} /></div>
          <p className="text-xs text-gray-400">The game replaces this map tile with the frames to the right.</p>
        </>}
      </div>

      <div className="flex flex-col items-center gap-3 border-l border-gray-700 p-3">
        <strong>Preview</strong>
        <MightyMikeAnimationPreview frames={animation?.tileNums ?? []} speed={animation?.speed ?? 1} images={mapImages} imageIndexes={tileImageIndexes} />
      </div>

      <div className="flex min-h-0 flex-col border-l border-gray-700 p-3">
        <strong className="mb-2">Frames</strong>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {animation?.tileNums.map((tile, index) => (
            <div key={index} className="grid grid-cols-[24px_1fr_auto_auto_auto] items-center gap-1">
              <span className="text-right text-gray-400">{index + 1}</span>
              <MightyMikeAnimationTileSelect value={tile} images={mapImages} imageIndexes={tileImageIndexes} onChange={(next) => setFrames(animation.tileNums.map((entry, current) => current === index ? next : entry))} />
              <Button size="sm" disabled={index === 0} onClick={() => {
                const next = [...animation.tileNums];
                const previous = next[index - 1];
                if (previous === undefined) return;
                next[index - 1] = tile; next[index] = previous; setFrames(next);
              }}>↑</Button>
              <Button size="sm" disabled={index === animation.tileNums.length - 1} onClick={() => {
                const next = [...animation.tileNums];
                const following = next[index + 1];
                if (following === undefined) return;
                next[index] = following; next[index + 1] = tile; setFrames(next);
              }}>↓</Button>
              <Button size="sm" variant="destructive" onClick={() => setFrames(animation.tileNums.filter((_entry, current) => current !== index))}>×</Button>
            </div>
          ))}
        </div>
        <Button className="mt-2" size="sm" disabled={!animation} onClick={() => setFrames([...(animation?.tileNums ?? []), 0])}>Add frame</Button>
      </div>

      <div className="flex min-h-0 flex-col border-l border-gray-700 p-3">
        <strong>Transparent colors</strong>
        <p className="mb-2 text-xs text-gray-400">Pixels using these palette colors are cut out everywhere in the tileset. The checkerboard in previews shows the resulting transparent areas.</p>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {tileset.transparencyColors.map((color, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-1">
              <MightyMikePaletteIndexSelect value={color} palette={palette} onChange={(next) => setTransparentColors(tileset.transparencyColors.map((entry, current) => current === index ? next : entry))} />
              <Button size="sm" variant="destructive" onClick={() => setTransparentColors(tileset.transparencyColors.filter((_entry, current) => current !== index))}>×</Button>
            </div>
          ))}
        </div>
        <Button className="mt-2" size="sm" onClick={() => {
          const unused = Array.from({ length: 256 }, (_entry, index) => index).find((index) => !tileset.transparencyColors.includes(index));
          if (unused !== undefined) setTransparentColors([...tileset.transparencyColors, unused]);
        }}>Add transparent color</Button>
      </div>
    </div>
  );
}
