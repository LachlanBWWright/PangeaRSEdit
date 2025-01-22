import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom, useAtomValue } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { SelectedWaterBody } from "../../../data/water/waterAtoms";
import {
  waterBodyNames,
  WaterBodyType,
} from "../../../data/water/ottoWaterItemType";
import { Globals } from "../../../data/globals/globals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WaterMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedWaterBody, setSelectedWaterBody] = useAtom(SelectedWaterBody);
  const globals = useAtomValue(Globals);

  if (data.Liqd === undefined) return;

  const waterBodyData =
    selectedWaterBody !== undefined
      ? data.Liqd[1000].obj[selectedWaterBody]
      : null;

  const waterBodyValues = Object.keys(WaterBodyType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  return (
    <div className="flex flex-col gap-2">
      {waterBodyData === null || waterBodyData === undefined ? (
        <div className="h-20 px-2">
          <Button
            onClick={() =>
              setData((data) => {
                data.Liqd[1000].obj.push({
                  type: 0,
                  nubs: [
                    [100, 100],
                    [100, 200],
                    [200, 200],
                    [200, 100],
                  ],
                  numNubs: 4,
                  hotSpotX: 150,
                  hotSpotZ: 150,
                  bBoxTop: 200,
                  bBoxLeft: 200,
                  bBoxBottom: 200,
                  bBoxRight: 200,
                  height: 0,
                  flags: 0,
                  reserved: 0,
                });

                //Push additional water nubs
                for (let i = 4; i < globals.LIQD_NUBS; i++) {
                  data.Liqd[1000].obj.at(-1)?.nubs.push([0, 0]);
                }
              })
            }
          >
            Add New Water Body
          </Button>
        </div>
      ) : (
        <p>
          Item {waterBodyData.type} ({waterBodyNames[waterBodyData.type]})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {waterBodyData !== null && waterBodyData !== undefined && (
          <>
            <Select
              value={waterBodyData.type.toString()}
              onValueChange={(e) => {
                const newItemType = parseInt(e);
                setData((data) => {
                  if (selectedWaterBody === undefined) return;
                  data.Liqd[1000].obj[selectedWaterBody].type = newItemType;
                });
              }}
            >
              <SelectTrigger>
                <SelectValue>{waterBodyNames[waterBodyData.type]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {waterBodyValues.map((key) => (
                  <SelectItem
                    key={key}
                    className="text-black"
                    value={key.toString()}
                  >
                    {waterBodyNames[key as WaterBodyType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() =>
                  setData((data) => {
                    if (selectedWaterBody === undefined) return;
                    if (
                      data.Liqd[1000].obj[selectedWaterBody].numNubs ===
                      globals.LIQD_NUBS
                    )
                      return;
                    let prevNub =
                      data.Liqd[1000].obj[selectedWaterBody].nubs[
                        data.Liqd[1000].obj[selectedWaterBody].numNubs - 1
                      ];
                    if (!prevNub) return;
                    console.log("prevnub", prevNub);
                    data.Liqd[1000].obj[selectedWaterBody].nubs[
                      data.Liqd[1000].obj[selectedWaterBody].numNubs
                    ] = [prevNub[0] + 50, prevNub[1] + 50];
                    data.Liqd[1000].obj[selectedWaterBody].numNubs++;
                  })
                }
              >
                Add Nub
              </Button>
              <Button
                disabled={
                  selectedWaterBody === undefined ||
                  data.Liqd[1000].obj[selectedWaterBody].numNubs <= 3
                }
                onClick={() => {
                  setData((data) => {
                    if (selectedWaterBody === undefined) return;
                    if (data.Liqd[1000].obj[selectedWaterBody].numNubs <= 3)
                      return;
                    data.Liqd[1000].obj[selectedWaterBody].numNubs--;
                  });
                }}
              >
                Delete Nub
              </Button>
              <DeleteButton
                disabled={selectedWaterBody === undefined}
                onClick={() => {
                  if (selectedWaterBody === undefined) return;
                  setData((data) => {
                    data.Liqd[1000].obj.splice(selectedWaterBody, 1);
                  });
                  setSelectedWaterBody(undefined);
                }}
              >
                Delete Water Body
              </DeleteButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
