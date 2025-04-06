import { Button } from "../components/Button";
import { FileUpload } from "../components/FileUpload";
import LzssWorker from "../utils/lzssWorker?worker";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  DataType,
  Game,
  Globals,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
  type GlobalsInterface,
} from "../data/globals/globals";
import { useAtom } from "jotai";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { preprocessJson } from "@/data/preprocessors/ottoPreprocessor";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Updater } from "use-immer";
import { Buffer } from "buffer";
import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import { PyodideMessage, PyodideResponse } from "@/python/pyodideWorker";
import { IntroText } from "./IntroText";

export function UploadPrompt({
  mapFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  pyodideWorker,
  setData,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  pyodideWorker: Worker;
  setData: Updater<ottoMaticLevel | null>;
}) {
  const [globals, setGlobals] = useAtom(Globals);
  const [showAllGames, setShowAllGames] = useState(false);
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

    //if (!mapFile) return;
    const levelBuffer = await file.arrayBuffer();

    //Call pyodide worker to run the python code

    const pyodidePromise = new Promise<ottoMaticLevel>((resolve, reject) => {
      pyodideWorker.postMessage({
        type: "save_to_json",
        bytes: levelBuffer,
        struct_specs: gameType.STRUCT_SPECS,
        include_types: [],
        exclude_types: [],
      } satisfies PyodideMessage);

      pyodideWorker.onmessage = (event: MessageEvent<PyodideResponse>) => {
        if (event.data.type === "save_to_json") {
          resolve(event.data.result);
        } else {
          reject(new Error("Unexpected response from pyodide worker"));
        }
      };
    });

    const jsonData = await pyodidePromise;

    preprocessJson(jsonData, globals);

    setData(jsonData);
    if (gameType.DATA_TYPE !== DataType.RSRC_FORK) {
      const imgRes = await fetch(url);
      const img = await imgRes.blob();
      const imgFile = new File([img], url.split("/").pop() ?? "");
      const imgBuffer = await imgFile.arrayBuffer();
      const imgDataView = new DataView(imgBuffer);
      const mapImages = await loadMapImages(imgDataView, gameType);

      setMapImagesFile(imgFile);
      setMapImages(mapImages);
    } else {
      //Bugdom 1-specific - The image data is within the Resource Fork
      console.log(jsonData);
      const imgString = jsonData.Timg[1000].data;
      console.log(imgString);
      const imgBuffer = Buffer.from(imgString, "hex");
      console.log(imgBuffer);
      console.log(imgBuffer.byteLength);
      console.log("Resized", imgBuffer.byteLength / 2 / 32 / 32);
      const imgDataView = new DataView(imgBuffer.buffer);
      const mapImages = await loadMapImages(imgDataView, gameType);

      setMapImages(mapImages);
    }
  };

  return (
    <div className="flex text-white m-auto flex-1 gap-8 flex-col items-center justify-center ">
      <div className="flex flex-col gap-2 lg:w-1/2">
        <IntroText />
        <div className="flex flex-row justify-center gap-2 items-center">
          <p>Show non-functional games</p>
          <Switch checked={showAllGames} onCheckedChange={setShowAllGames} />
        </div>
      </div>
      <div className="lg:w-1/2">
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

            const mapImages = await loadMapImages(dataView, globals);
            setMapImagesFile(mapImagesFile);
            setMapImages(mapImages);
          }}
        />
      </div>

      <div className="flex flex-row gap-8 overflow-x-auto flex-wrap justify-center max-w-full  ">
        <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
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
        {showAllGames && (
          <>
            {" "}
            <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
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
                  openFile("assets/bugdom/terrain/BeeHive.ter", BugdomGlobals)
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
            <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
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
            <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
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
                  openFile(
                    "assets/croMag/terrain/StoneAge_Ice.ter",
                    CroMagGlobals,
                  )
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
            <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
              <p>Cro-Mag Battles </p>
              <Button
                onClick={() =>
                  openFile(
                    "assets/croMag/terrain/Battle_Aztec.ter",
                    CroMagGlobals,
                  )
                }
              >
                Aztec
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/croMag/terrain/Battle_Celtic.ter",
                    CroMagGlobals,
                  )
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
                  openFile(
                    "assets/croMag/terrain/Battle_Maze.ter",
                    CroMagGlobals,
                  )
                }
              >
                Maze
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/croMag/terrain/Battle_Ramps.ter",
                    CroMagGlobals,
                  )
                }
              >
                Ramps
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/croMag/terrain/Battle_Spiral.ter",
                    CroMagGlobals,
                  )
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
            <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
              <p>Nanosaur Levels</p>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur/terrain/Level1.ter",
                    NanosaurGlobals,
                  )
                }
              >
                Default
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur/terrain/Level1Pro.ter",
                    NanosaurGlobals,
                  )
                }
              >
                Extreme
              </Button>
            </div>
            <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
              <p>Nanosaur 2 Levels</p>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/level1.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Level 1
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/level2.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Level 2
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/level3.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Level 3
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/battle1.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Battle 1
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/battle2.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Battle 2
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/battle3.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Battle 3
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/race1.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Race 1
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/race2.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                Race 2
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/flag1.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                CTF 1
              </Button>
              <Button
                onClick={() =>
                  openFile(
                    "assets/nanosaur2/terrain/flag2.ter",
                    Nanosaur2Globals,
                  )
                }
              >
                CTF 2
              </Button>
            </div>
            <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1 min-w-40">
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
            </div>{" "}
          </>
        )}
      </div>
    </div>
  );
}

async function loadMapImages(dataView: DataView, globals: GlobalsInterface) {
  let offset = 0;

  const loadPromise: Promise<HTMLCanvasElement[]> = new Promise((res, err) => {
    //Read Each
    if (globals.GAME_TYPE !== Game.BUGDOM) {
      //Find the number of supertiles
      let numSupertiles = 0;
      while (offset != dataView.byteLength) {
        const size = dataView.getInt32(offset);
        offset += 4;
        if (size === 0) break;
        offset += size;
        numSupertiles++;
      }
      offset = 0; //Reset offset

      const mapImages: HTMLCanvasElement[] = new Array(numSupertiles);
      const resolvedTiles = { count: 0 };

      let supertileId = 0;
      while (offset < dataView.byteLength) {
        let size = dataView.getInt32(offset);

        offset += 4;
        const buffer = new DataView(
          dataView.buffer.slice(offset, offset + size),
        );
        const decompressedSize =
          globals.SUPERTILE_TEXMAP_SIZE * globals.SUPERTILE_TEXMAP_SIZE * 2;
        offset += size;

        const lzssWorker = new LzssWorker();
        lzssWorker.onmessage = (e: MessageEvent<LzssResponse>) => {
          const data = e.data;
          if (data.type !== "decompressRes") return;

          //mapImagesData[data.id] = decompressedBuffer.buffer; //.push(decompressedBuffer.buffer);

          const imgCanvas = document.createElement("canvas");
          imgCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
          imgCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
          const imgCtx = imgCanvas.getContext("2d");

          if (!imgCtx) {
            err("Bad data!");
            throw new Error("Bad data!");
          }
          //16-bit buffer from current buffer
          imgCtx.putImageData(data.imageData, 0, 0);

          mapImages[data.id] = imgCanvas;

          resolvedTiles.count++;
          if (resolvedTiles.count === numSupertiles) {
            res(mapImages);
          }
          lzssWorker.terminate();
        };
        lzssWorker.postMessage({
          compressedDataView: buffer,
          outputSize: decompressedSize,
          type: "decompress",
          id: supertileId,
          width: globals.SUPERTILE_TEXMAP_SIZE,
          height: globals.SUPERTILE_TEXMAP_SIZE,
        } satisfies LzssMessage);
        supertileId++;
      }
      return [];
    }
  });
  const res = await loadPromise;
  return res;
}

/* else {
    //Budgdom 1 Logic - TODO: Not completed

    const mapImages: HTMLCanvasElement[] = [];
    //const mapImagesData: ArrayBuffer[] = new Array(numSupertiles);

    while (offset != dataView.byteLength) {
      numSupertiles++;

      const size =
        globals.SUPERTILE_TEXMAP_SIZE * globals.SUPERTILE_TEXMAP_SIZE * 2;
      const bufferSlice = new DataView(
        dataView.buffer.slice(offset, offset + size),
      );

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

      sixteenBitToImageData(bufferSlice, imageData);

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
  } */
