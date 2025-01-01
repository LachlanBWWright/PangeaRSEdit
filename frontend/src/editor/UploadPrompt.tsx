import { Button } from "../components/Button";
import { FileUpload } from "../components/FileUpload";
import { lzssDecompress } from "../utils/lzss";
import { sixteenBitToImageData } from "../utils/imageConverter";
import {
  /*   BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals, */
  DataType,
  Globals,
  /*   Nanosaur2Globals,
  NanosaurGlobals, */
  OttoGlobals,
  type GlobalsInterface,
} from "../data/globals/globals";
import { useAtom } from "jotai";

export function UploadPrompt({
  mapFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
}) {
  const [globals, setGlobals] = useAtom(Globals);
  const openFile = async (url: string, gameType: GlobalsInterface) => {
    /*All games' Resource Forks are .ter.rsrc, except for Nanosaur, which stores data in a .ter using a proprietary format
    Terrain files are .ter, except for Nanosaur, which is .trt, and Bugdom, 
    where there is no separate image file, as it's just in the Resource Fork
    */
    const rsrcName =
      gameType.DATA_TYPE !== DataType.TRT_FILE ? url + ".rsrc" : url;
    const name = rsrcName.split("/").pop();
    if (!name) return;

    setGlobals(gameType);

    const res = await fetch(rsrcName);
    const file = await res.blob();
    setMapFile(new File([file], name));

    if (gameType.DATA_TYPE === DataType.TRT_FILE) {
      //replace .ter at the end with .trt
      url = url.split(".")[0] + ".trt";
    }

    const imgRes = await fetch(url);
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    const imgDataView = new DataView(imgBuffer);
    const mapImages = loadMapImages(imgDataView, globals);

    setMapImagesFile(imgFile);
    setMapImages(mapImages);
  };

  return (
    <div className="flex text-white m-auto flex-1 gap-8 flex-col items-center justify-center">
      <div className="flex flex-col gap-2 w-1/2">
        <p className="text-6xl pb-2">Pangea Level Editor</p>
        <Button
          onClick={() =>
            window.open("https://github.com/LachlanBWWright/PangeaRSEdit")
          }
        >
          View on GitHub
        </Button>
        <p>
          This is a work in progress level editor for Otto Matic (And hopefully
          additional Pangea Software games).
        </p>
        <p>
          Introducing items that were not originally found in the level will be
          likely to cause Otto Matic to crash. Downloaded levels can be used by
          replacing the existing by level data, which can be found in the
          Terrain folder within Otto's Data folder.
        </p>
        <p>
          {" "}
          This project uses{" "}
          <a
            className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
            href="https://github.com/jorio/rsrcdump"
          >
            RSRCDump
          </a>{" "}
          by Jorio, the creator of the ports of Pangea games to modern day
          operating systems. Any feedback is appreciated!
        </p>
      </div>
      <div className="w-1/2">
        {/*         <select className="text-black w-full">
          <option>Otto Matic</option>
          <option>Bugdom 2</option>
        </select> */}
        <p>Upload Level Data (.ter.rsrc)</p>
        <FileUpload
          className="text-2xl"
          acceptType=".ter.rsrc"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            setMapFile(file);
          }}
        />
        <p>Upload Texture Data (.ter)</p>
        <FileUpload
          className="text-2xl"
          acceptType=".ter"
          disabled={!mapFile}
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;
            const mapImagesFile = e.target.files[0];
            const buffer = await mapImagesFile.arrayBuffer();

            //Uses Big Endian by default - Which is what Otto uses
            const dataView = new DataView(buffer);

            const mapImages = loadMapImages(dataView, globals);
            setMapImagesFile(mapImagesFile);
            setMapImages(mapImages);
          }}
        />
      </div>

      <div className="flex flex-row gap-8 overflow-x-auto justify-center w-full ">
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Otto Matic Levels</p>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/EarthFarm.ter", OttoGlobals)
            }
          >
            Level 1
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/BlobWorld.ter", OttoGlobals)
            }
          >
            Level 2
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/BlobBoss.ter", OttoGlobals)
            }
          >
            Level 3
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/Apocalypse.ter", OttoGlobals)
            }
          >
            Level 4
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/Cloud.ter", OttoGlobals)
            }
          >
            Level 5
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/Jungle.ter", OttoGlobals)
            }
          >
            Level 6
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/JungleBoss.ter", OttoGlobals)
            }
          >
            Level 7
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/FireIce.ter", OttoGlobals)
            }
          >
            Level 8
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/Saucer.ter", OttoGlobals)
            }
          >
            Level 9
          </Button>
          <Button
            onClick={() =>
              openFile("assets/ottoMatic/terrain/BrainBoss.ter", OttoGlobals)
            }
          >
            Level 10
          </Button>
        </div>
        {/*         <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Bugdom Levels </p>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/Training.ter", BugdomGlobals)
            }
          >
            Level 1
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/Lawn.ter", BugdomGlobals)
            }
          >
            Level 2
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/Pond.ter", BugdomGlobals)
            }
          >
            Level 3
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/Beach.ter", BugdomGlobals)
            }
          >
            Level 4
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/Flight.ter", BugdomGlobals)
            }
          >
            Level 5
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/Hive.ter", BugdomGlobals)
            }
          >
            Level 6
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/QueenBee.ter", BugdomGlobals)
            }
          >
            Level 7
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/Night.ter", BugdomGlobals)
            }
          >
            Level 8
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/AntHill.ter", BugdomGlobals)
            }
          >
            Level 9
          </Button>
          <Button
            onClick={() =>
              openFile("assets/bugdom/terrain/AntKing.ter", BugdomGlobals)
            }
          >
            Level 10
          </Button>
        </div>
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Bugdom 2 Levels </p>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level1_Garden.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 1
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level2_SideWalk.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 2
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level3_DogHair.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 3
          </Button>
          <Button disabled>Level 4</Button>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level5_Playroom.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 5
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level6_Closet.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 6
          </Button>
          <Button disabled>Level 7</Button>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level8_Garbage.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 8
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level9_Balsa.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 9
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/bugdom2/terrain/Level10_Park.ter",
                Bugdom2Globals,
              )
            }
          >
            Level 10
          </Button>
        </div>
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Cro-Mag Races</p>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/StoneAge_Desert.ter",
                CroMagGlobals,
              )
            }
          >
            Desert
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/StoneAge_Jungle.ter",
                CroMagGlobals,
              )
            }
          >
            Jungle
          </Button>
          <Button
            onClick={() =>
              openFile("assets/croMag/terrain/StoneAge_Ice.ter", CroMagGlobals)
            }
          >
            Ice
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/BronzeAge_Crete.ter",
                CroMagGlobals,
              )
            }
          >
            Crete
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/BronzeAge_China.ter",
                CroMagGlobals,
              )
            }
          >
            China
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/BronzeAge_Egypt.ter",
                CroMagGlobals,
              )
            }
          >
            Egypt
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/IronAge_Europe.ter",
                CroMagGlobals,
              )
            }
          >
            Europe
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/IronAge_Scandinavia.ter",
                CroMagGlobals,
              )
            }
          >
            Scandinavia
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/IronAge_Atlantis.ter",
                CroMagGlobals,
              )
            }
          >
            Atlantis
          </Button>
        </div>
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Cro-Mag Battles </p>
          <Button
            onClick={() =>
              openFile("assets/croMag/terrain/Battle_Aztec.ter", CroMagGlobals)
            }
          >
            Aztec
          </Button>
          <Button
            onClick={() =>
              openFile("assets/croMag/terrain/Battle_Celtic.ter", CroMagGlobals)
            }
          >
            Celtic
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/Battle_Coliseum.ter",
                CroMagGlobals,
              )
            }
          >
            Coliseum
          </Button>
          <Button
            onClick={() =>
              openFile("assets/croMag/terrain/Battle_Maze.ter", CroMagGlobals)
            }
          >
            Maze
          </Button>
          <Button
            onClick={() =>
              openFile("assets/croMag/terrain/Battle_Ramps.ter", CroMagGlobals)
            }
          >
            Ramps
          </Button>
          <Button
            onClick={() =>
              openFile("assets/croMag/terrain/Battle_Spiral.ter", CroMagGlobals)
            }
          >
            Spiral
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/Battle_StoneHenge.ter",
                CroMagGlobals,
              )
            }
          >
            Stonehenge
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/croMag/terrain/Battle_TarPits.ter",
                CroMagGlobals,
              )
            }
          >
            Tar Pits
          </Button>
        </div>{" "}
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Nanosaur Levels</p>
          <Button
            onClick={() =>
              openFile("assets/nanosaur/terrain/Level1.ter", NanosaurGlobals)
            }
          >
            Default
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur/terrain/Level1Pro.ter", NanosaurGlobals)
            }
          >
            Extreme
          </Button>
        </div>
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Nanosaur 2 Levels</p>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/level1.ter", Nanosaur2Globals)
            }
          >
            Level 1
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/level2.ter", Nanosaur2Globals)
            }
          >
            Level 2
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/level3.ter", Nanosaur2Globals)
            }
          >
            Level 3
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/battle1.ter", Nanosaur2Globals)
            }
          >
            Battle 1
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/battle2.ter", Nanosaur2Globals)
            }
          >
            Battle 2
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/battle3.ter", Nanosaur2Globals)
            }
          >
            Battle 3
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/race1.ter", Nanosaur2Globals)
            }
          >
            Race 1
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/race2.ter", Nanosaur2Globals)
            }
          >
            Race 2
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/flag1.ter", Nanosaur2Globals)
            }
          >
            CTF 1
          </Button>
          <Button
            onClick={() =>
              openFile("assets/nanosaur2/terrain/flag2.ter", Nanosaur2Globals)
            }
          >
            CTF 2
          </Button>
        </div>
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
          <p>Billy Frontier Levels</p>
          <Button
            onClick={() =>
              openFile(
                "assets/billyFrontier/terrain/swamp_duel.ter",
                BillyFrontierGlobals,
              )
            }
          >
            Swamp Duel
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/billyFrontier/terrain/swamp_shootout.ter",
                BillyFrontierGlobals,
              )
            }
          >
            Swamp Shootout
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/billyFrontier/terrain/swamp_stampede.ter",
                BillyFrontierGlobals,
              )
            }
          >
            Swamp Stampede
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/billyFrontier/terrain/town_duel.ter",
                BillyFrontierGlobals,
              )
            }
          >
            Town Duel
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/billyFrontier/terrain/town_shootout.ter",
                BillyFrontierGlobals,
              )
            }
          >
            Town Shootout
          </Button>
          <Button
            onClick={() =>
              openFile(
                "assets/billyFrontier/terrain/town_stampede.ter",
                BillyFrontierGlobals,
              )
            }
          >
            Town Stampede
          </Button>
        </div> */}
      </div>
    </div>
  );
}

function loadMapImages(
  dataView: DataView,
  globals: GlobalsInterface,
): HTMLCanvasElement[] {
  let offset = 0;
  let numSupertiles = 0;

  const mapImages: HTMLCanvasElement[] = [];
  const mapImagesData: ArrayBuffer[] = [];

  const canvas = document.createElement("canvas");
  canvas.width = globals.SUPERTILE_TEXMAP_SIZE;
  canvas.height = globals.SUPERTILE_TEXMAP_SIZE;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  //Read Each
  while (offset != dataView.byteLength) {
    numSupertiles++;
    let size = dataView.getInt32(offset);

    offset += 4;
    const buffer = new DataView(dataView.buffer.slice(offset, offset + size));

    const decompressedSize =
      globals.SUPERTILE_TEXMAP_SIZE * globals.SUPERTILE_TEXMAP_SIZE * 2;
    const decompressedBuffer = new DataView(new ArrayBuffer(decompressedSize));
    lzssDecompress(buffer, decompressedBuffer);
    mapImagesData.push(decompressedBuffer.buffer);

    //const imgCanvas = document.createElement("canvas");
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
    imgCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
    const imgCtx = imgCanvas.getContext("2d");

    const imageData = imgCtx?.getImageData(
      0,
      0,
      imgCanvas.width,
      imgCanvas.height,
    );

    if (!imageData) {
      throw new Error("Could not create image data");
    }

    sixteenBitToImageData(decompressedBuffer, imageData);

    if (!imgCtx) {
      throw new Error("Bad data!");
    }
    //16-bit buffer from current buffer
    imgCtx?.putImageData(imageData, 0, 0);

    offset += size;
    imgCanvas;
    mapImages.push(imgCanvas);
  }
  return mapImages;
}
