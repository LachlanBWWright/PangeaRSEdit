import { PyodideInterface } from "pyodide";
import { useEffect, useState } from "react";
import { load_bytes_from_json, save_to_json } from "../python/rsrcdump";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { ottoMaticSpecs } from "../python/structSpecs/ottoMatic";
import { UploadPrompt } from "./UploadPrompt";

export function MapPrompt({ pyodide }: { pyodide: PyodideInterface }) {
  const [data, setData] = useState<ottoMaticLevel | null>(null);
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
        [],
      );
      setData(res);
    };
    loadMap();
  }, [mapFile]);

  async function saveMap() {
    if (!mapFile) return;
    let loadRes = await load_bytes_from_json(
      pyodide,
      mapFile,
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
    <div className="flex flex-col gap-2 text-white min-w-full">
      <p className="text-xl">{mapFile.name}</p>
      <button className="bg-blue-400 p-2 rounded-md" onClick={(e) => saveMap()}>
        Save and download map
      </button>
      <hr />
    </div>
  );
}

/*       console.log("Fence nubs", res.FnNb);

      const nubKeys = Object.keys(res.FnNb);

      //Fence Remover 9000
      for (const key of nubKeys) {
        res.FnNb[parseInt(key)].obj.forEach((item) => {
          item[0] = 0;
          item[1] = 1;
        });
      } */
