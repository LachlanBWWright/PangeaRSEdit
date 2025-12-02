export interface GameModel {
  name: string;
  bg3dFile: string;
  skeletonFile?: string;
  description?: string;
  category: "Characters" | "Levels" | "Objects";
}

interface Props {
  selectedModel: GameModel | null;
}

export default function ModelDetails({ selectedModel }: Props) {
  if (!selectedModel) return null;

  return (
    <div className="text-xs text-gray-400 space-y-1 p-3 bg-gray-700 rounded">
      <p>
        <strong>Model:</strong> {selectedModel.name}
      </p>
      <p>
        <strong>BG3D File:</strong> {selectedModel.bg3dFile.split("/").pop()}
      </p>
      {selectedModel.skeletonFile && (
        <p>
          <strong>Skeleton File:</strong>{" "}
          {selectedModel.skeletonFile.split("/").pop()}
        </p>
      )}
      {selectedModel.description && (
        <p>
          <strong>Description:</strong> {selectedModel.description}
        </p>
      )}
    </div>
  );
}
