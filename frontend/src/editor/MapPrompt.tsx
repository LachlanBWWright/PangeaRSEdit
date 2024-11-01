import { PyodideInterface } from "pyodide";
import { useEffect, useState } from "react";
import { load_bytes_from_json, save_to_json } from "../python/rsrcdump";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { ottoMaticSpecs } from "../python/structSpecs/ottoMatic";
import { UploadPrompt } from "./UploadPrompt";
import { EditorView } from "./EditorView";
import { Button } from "../components/Button";
import { Updater, useImmer } from "use-immer";

export function MapPrompt({ pyodide }: { pyodide: PyodideInterface }) {
  const [data, setData] = useImmer<ottoMaticLevel | null>(null);
  const [mapFile, setMapFile] = useState<undefined | File>(undefined);
  useEffect(() => {
    const loadMap = async () => {
      if (!mapFile) return;
      const levelBuffer = await mapFile.arrayBuffer();

      let res = await save_to_json<ottoMaticLevel>(
        pyodide,
        levelBuffer,
        ottoMaticSpecs,
        [],
        []
      );
      setData(res);
    };
    loadMap();
  }, [mapFile]);

  async function saveMap() {
    if (!mapFile) return;
    let loadRes = await load_bytes_from_json(
      pyodide,
      data,
      ottoMaticSpecs,
      [],
      []
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
      <p className="text-xl">{mapFile.name}</p>
      <Button onClick={() => saveMap()}>Save and download map</Button>
      <hr />
      {data ? (
        <EditorView data={data} setData={setData as Updater<ottoMaticLevel>} />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
