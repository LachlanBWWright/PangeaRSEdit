export function UploadPrompt({
  setMapFile,
}: {
  setMapFile: (file: File) => void;
}) {
  return (
    <div className="text-white m-auto flex-1">
      <input
        type="file"
        accept=".ter.rsrc"
        onChange={async (e) => {
          if (!e.target?.files?.[0]) return;

          const file = e.target.files[0];
          setMapFile(file);
        }}
      />
    </div>
  );
}
