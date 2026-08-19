import { useMemo } from "react";
import { TextureManager, type Texture as TextureManagerTexture } from "@/components/TextureManager";
import {
  tunnelTextureToDataUrl,
  tunnelTextureToCanvas,
  imageDataToTunnelTexture,
  validateTunnelTextureDimensions,
} from "@/data/tunnelParser/textureUtils";
import type { TunnelData, TunnelTexture } from "@/data/tunnelParser/types";
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";

interface TunnelTextureItem {
  sourceName: "Tunnel Texture" | "Water Texture";
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
}

type TunnelTextureField = "tunnelTexture" | "waterTexture";

interface TunnelTexturesPanelProps {
  tunnelData: TunnelData;
  onUpdateTunnelData: (nextData: TunnelData) => void;
}

function getTextureByName(
  tunnelData: TunnelData,
  textureName: string,
): { field: TunnelTextureField; texture: TunnelTexture } | null {
  if (textureName.startsWith("Tunnel Texture")) {
    return { field: "tunnelTexture", texture: tunnelData.tunnelTexture };
  }

  if (textureName.startsWith("Water Texture")) {
    return { field: "waterTexture", texture: tunnelData.waterTexture };
  }

  return null;
}

async function loadImageDataFromFile(file: File): Promise<ImageData> {
  const objectUrl = URL.createObjectURL(file);

  const imageLoadResult = await ResultAsync.fromPromise(
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to decode image"));
      image.src = objectUrl;
    }),
    mapErr,
  );

  URL.revokeObjectURL(objectUrl);

  if (imageLoadResult.isErr()) {
    return Promise.reject(imageLoadResult.error);
  }

  const image = imageLoadResult.value;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject("Failed to create image canvas context");
  }

  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function updateTunnelTextureField(
  tunnelData: TunnelData,
  field: TunnelTextureField,
  texture: TunnelTexture,
): TunnelData {
  if (field === "tunnelTexture") {
    return {
      ...tunnelData,
      tunnelTexture: texture,
    };
  }

  return {
    ...tunnelData,
    waterTexture: texture,
  };
}

export function TunnelTexturesPanel({
  tunnelData,
  onUpdateTunnelData,
}: TunnelTexturesPanelProps) {
  const textures = useMemo<TunnelTextureItem[]>(() => {
    return [
      {
        sourceName: "Tunnel Texture",
        name: `Tunnel Texture (${tunnelData.tunnelTexture.width}x${tunnelData.tunnelTexture.height})`,
        url: tunnelTextureToDataUrl(tunnelData.tunnelTexture),
        type: "diffuse",
      },
      {
        sourceName: "Water Texture",
        name: `Water Texture (${tunnelData.waterTexture.width}x${tunnelData.waterTexture.height})`,
        url: tunnelTextureToDataUrl(tunnelData.waterTexture),
        type: "diffuse",
      },
    ];
  }, [tunnelData.tunnelTexture, tunnelData.waterTexture]);

  const applyImageDataUpdate = async (
    textureName: string,
    imageData: ImageData,
  ): Promise<void> => {
    const sourceTexture = getTextureByName(tunnelData, textureName);
    if (!sourceTexture) {
      return Promise.reject(`Unknown texture: ${textureName}`);
    }

    const nextTexture = imageDataToTunnelTexture(imageData);
    const validationResult = validateTunnelTextureDimensions(
      sourceTexture.texture,
      nextTexture,
    );
    if (validationResult.isErr()) {
      return Promise.reject(validationResult.error);
    }

    onUpdateTunnelData(
      updateTunnelTextureField(tunnelData, sourceTexture.field, nextTexture),
    );
  };

  const handleDownloadTexture = (texture: TextureManagerTexture) => {
    const sourceTexture = getTextureByName(tunnelData, texture.name);
    if (!sourceTexture) {
      return;
    }

    const canvas = tunnelTextureToCanvas(sourceTexture.texture);
    const dataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download =
      sourceTexture.field === "tunnelTexture"
        ? "tunnel-texture.png"
        : "water-texture.png";
    link.click();
  };

  const handleReplaceTexture = async (
    texture: TextureManagerTexture,
    file: File,
  ): Promise<void> => {
    const imageData = await loadImageDataFromFile(file);
    return applyImageDataUpdate(texture.name, imageData);
  };

  const handleTextureEdit = async (
    texture: TextureManagerTexture,
    editedImageData: ImageData,
  ): Promise<void> => {
    return applyImageDataUpdate(texture.name, editedImageData);
  };

  return (
    <div className="p-3 overflow-y-auto h-full">
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-semibold text-white">Embedded Textures</h3>
        <p className="text-xs text-gray-400">
          Edit the texture baked into the .tun file. Replacements must keep the
          original width and height.
        </p>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="rounded bg-gray-700 px-2 py-1 text-gray-200">
            Tunnel texture: {tunnelData.tunnelTexture.width}x
            {tunnelData.tunnelTexture.height} (
            {tunnelData.tunnelTexture.data.byteLength.toLocaleString()} bytes)
          </div>
          <div className="rounded bg-gray-700 px-2 py-1 text-gray-200">
            Water texture: {tunnelData.waterTexture.width}x
            {tunnelData.waterTexture.height} (
            {tunnelData.waterTexture.data.byteLength.toLocaleString()} bytes)
          </div>
        </div>
      </div>
      <TextureManager
        textures={textures}
        onDownloadTexture={handleDownloadTexture}
        onReplaceTexture={handleReplaceTexture}
        onTextureEdit={handleTextureEdit}
      />
    </div>
  );
}
