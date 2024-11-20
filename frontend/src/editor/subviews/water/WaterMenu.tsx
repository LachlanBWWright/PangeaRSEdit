import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { SelectedWaterBody } from "../../../data/water/waterAtoms";
import {
  waterBodyNames,
  WaterBodyType,
} from "../../../data/water/ottoWaterItemType";

export function WaterMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedWaterBody, setSelectedWaterBody] = useAtom(SelectedWaterBody);

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
          <Button>Add New Water Body</Button>
        </div>
      ) : (
        <p>
          Item {waterBodyData.type} ({waterBodyNames[waterBodyData.type]})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {waterBodyData !== null && waterBodyData !== undefined && (
          <>
            <select
              value={waterBodyData.type}
              className="text-black"
              onChange={(e) => {
                const newItemType = parseInt(e.target.value);
                setData((data) => {
                  if (selectedWaterBody === undefined) return;
                  data.Liqd[1000].obj[selectedWaterBody].type = newItemType;
                });
              }}
            >
              {waterBodyValues.map((key) => (
                <option key={key} className="text-black" value={key}>
                  {waterBodyNames[key as WaterBodyType]}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <Button disabled>Add Nub</Button>
              <Button disabled>Delete Nub</Button>
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
