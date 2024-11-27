import { PyodideInterface } from "pyodide";
import { useEffect, useState } from "react";
import { load_bytes_from_json, save_to_json } from "../python/rsrcdump";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { ottoMaticSpecs } from "../python/structSpecs/ottoMatic";
import { UploadPrompt } from "./UploadPrompt";
import { EditorView } from "./EditorView";
import { Button } from "../components/Button";
import { Updater, useImmer } from "use-immer";
import ottoPreprocessor, {
  newJsonProcess,
} from "../data/preprocessors/ottoPreprocessor";

export function MapPrompt({ pyodide }: { pyodide: PyodideInterface }) {
  const [data, setData] = useImmer<ottoMaticLevel | null>(null);
  const [mapFile, setMapFile] = useState<undefined | File>(undefined);
  const [processed, setProcessed] = useState(false);
  useEffect(() => {
    const loadMap = async () => {
      if (!mapFile) return;
      const levelBuffer = await mapFile.arrayBuffer();

      let res = await save_to_json<ottoMaticLevel>(
        pyodide,
        levelBuffer,
        ottoMaticSpecs,
        [],
        [],
      );

      newJsonProcess(res);
      setData(res);
    };
    loadMap();
  }, [mapFile]);

  useEffect(() => {
    if (!processed) return;
    saveMap();
    setProcessed(false);
  }, [processed, data]);

  async function saveMap() {
    if (!mapFile) return;
    let loadRes = await load_bytes_from_json(
      pyodide,
      data,
      ottoMaticSpecs,
      [],
      [],
    );

    const mapBlob = new Blob([loadRes], { type: ".ter.rsrc" });
    const mapUrl = URL.createObjectURL(mapBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = mapUrl;
    downloadLink.setAttribute("download", mapFile.name);
    downloadLink.click();
  }

  if (!mapFile) return <UploadPrompt setMapFile={setMapFile} />;
  return (
    <div className="flex flex-col gap-2 text-white h-screen max-h-screen overflow-clip min-w-full p-2 md:p-6">
      <div className="flex flex-row gap-2 mx-auto w-full px-auto justify-center">
        <p className="text-xl">Change map</p>
        <input
          type="file"
          accept=".ter.rsrc"
          onChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            setMapFile(file);
          }}
        />
        <p className="text-xl">{mapFile.name}</p>
        <Button
          onClick={() => {
            ottoPreprocessor(setData as Updater<ottoMaticLevel>);
            setProcessed(true); //Trigger useEffect for downloading
          }}
        >
          Save and download map
        </Button>
      </div>
      <hr />
      {data !== null && data !== undefined ? (
        <EditorView data={data} setData={setData as Updater<ottoMaticLevel>} />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
