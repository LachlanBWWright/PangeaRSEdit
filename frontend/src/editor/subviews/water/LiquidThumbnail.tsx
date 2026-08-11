import { type GlobalsInterface } from "@/data/globals/globals";
import { useMemo } from "react";
import { useGameLiquidTexture } from "./useGameLiquidTexture";

export function LiquidThumbnail({
  globals,
  liquidType,
}: {
  globals: GlobalsInterface;
  liquidType: number;
}) {
  const texture = useGameLiquidTexture(globals, liquidType);
  const src = useMemo(() => texture?.toDataURL("image/png") ?? null, [texture]);

  if (!src) {
    return <span className="h-4 w-6 shrink-0 rounded-sm bg-slate-700" />;
  }

  return (
    <img
      src={src}
      alt=""
      className="h-4 w-6 shrink-0 rounded-sm object-cover"
    />
  );
}

export function LiquidPreview({
  alt,
  globals,
  liquidType,
}: {
  alt: string;
  globals: GlobalsInterface;
  liquidType: number;
}) {
  const texture = useGameLiquidTexture(globals, liquidType);
  const src = useMemo(() => texture?.toDataURL("image/png") ?? null, [texture]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className="max-h-36 max-w-full object-contain"
    />
  );
}
