import { Button } from "../components/Button";
import { FileUpload } from "../components/FileUpload";

//import level1Url from "./assets/ottoMatic/terrain/EarthFarm.ter.rsrc?url";

export function UploadPrompt({
  setMapFile,
}: {
  setMapFile: (file: File) => void;
}) {
  const useFile = async (url: string) => {
    const name = url.split("/").pop();
    if (!name) return;

    const res = await fetch(url);
    const file = await res.blob();
    setMapFile(new File([file], name));
  };

  return (
    <div className="flex text-white m-auto flex-1 gap-8 flex-col items-center justify-center">
      <div className="w-1/2">
        <FileUpload
          className="text-2xl"
          acceptType="file"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            setMapFile(file);
          }}
        />
      </div>
      <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
        <p>Otto Matic Levels</p>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/EarthFarm.ter.rsrc")}
        >
          Level 1
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/BlobWorld.ter.rsrc")}
        >
          Level 2
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/BlobBoss.ter.rsrc")}
        >
          Level 3
        </Button>
        <Button
          onClick={() =>
            useFile("assets/ottoMatic/terrain/Apocalypse.ter.rsrc")
          }
        >
          Level 4
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/Cloud.ter.rsrc")}
        >
          Level 5
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/Jungle.ter.rsrc")}
        >
          Level 6
        </Button>
        <Button
          onClick={() =>
            useFile("assets/ottoMatic/terrain/JungleBoss.ter.rsrc")
          }
        >
          Level 7
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/FireIce.ter.rsrc")}
        >
          Level 8
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/Saucer.ter.rsrc")}
        >
          Level 9
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/BrainBoss.ter.rsrc")}
        >
          Level 10
        </Button>
      </div>
    </div>
  );
}
