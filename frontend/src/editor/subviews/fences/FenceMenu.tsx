import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { FenceType, fenceTypeNames } from "../../../data/fences/ottoFenceType";

const NUB_KEY_BASE = 1000;

export default function FenceMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedFence, setSelectedFence] = useAtom(SelectedFence);

  const fenceData =
    selectedFence !== undefined ? data.Fenc[1000].obj[selectedFence] : null;

  const fenceValues = Object.keys(FenceType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  return (
    <div className="flex flex-col gap-2">
      {fenceData === null ? (
        <p>No Fence Selected</p>
      ) : (
        <p>
          Fence {selectedFence} ({fenceData.numNubs} points)
        </p>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-2 w-full">
        <div className="flex flex-col">
          {fenceData !== null && (
            <>
              <img
                src={`assets/ottoMatic/fences/fence${String(
                  fenceData.fenceType
                ).padStart(3, "0")}.png`}
                className="max-h-40 mx-auto"
              />
              <select
                value={fenceData.fenceType}
                className="text-black"
                onChange={(e) => {
                  const newFenceType = parseInt(e.target.value);
                  setData((data) => {
                    if (selectedFence === undefined) return;
                    data.Fenc[1000].obj[selectedFence].fenceType = newFenceType;
                  });
                }}
              >
                {fenceValues.map((key) => (
                  <option key={key} className="text-black" value={key}>
                    {fenceTypeNames[key as FenceType]}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            disabled={selectedFence === undefined}
            onClick={() => {
              setData((data) => {
                if (selectedFence === undefined) return;

                data.Fenc[1000].obj[selectedFence].numNubs++;

                data.FnNb[selectedFence + NUB_KEY_BASE].obj.unshift([
                  data.FnNb[selectedFence + NUB_KEY_BASE].obj[0][0] - 25,
                  data.FnNb[selectedFence + NUB_KEY_BASE].obj[0][1] - 25,
                ]);
              });
            }}
          >
            Add Front Nub
          </Button>
          <Button
            disabled={selectedFence === undefined}
            onClick={() => {
              setData((data) => {
                if (selectedFence === undefined) return;
                const lastIdx =
                  data.FnNb[selectedFence + NUB_KEY_BASE].obj.length - 1;
                data.Fenc[1000].obj[selectedFence].numNubs++;

                data.FnNb[selectedFence + NUB_KEY_BASE].obj.push([
                  data.FnNb[selectedFence + NUB_KEY_BASE].obj[lastIdx][0] + 25,
                  data.FnNb[selectedFence + NUB_KEY_BASE].obj[lastIdx][1] + 25,
                ]);
              });
            }}
          >
            Add Back Nub
          </Button>
          <DeleteButton
            disabled={selectedFence === undefined}
            onClick={() => {
              if (selectedFence === undefined) return;

              setData((data) => {
                data.Fenc[1000].obj.splice(selectedFence, 1);

                let lastKey: string | undefined = undefined;
                for (const nubKey of Object.keys(data.FnNb)) {
                  lastKey = nubKey;
                  if (parseInt(nubKey) > selectedFence + NUB_KEY_BASE) {
                    data.FnNb[parseInt(nubKey) - 1] =
                      data.FnNb[parseInt(nubKey)];
                  }
                }
                if (lastKey === undefined)
                  throw new Error("Missing Final Nubkey");
                delete data.FnNb[parseInt(lastKey)];
              });
              setSelectedFence(undefined);
            }}
          >
            Delete Fence
          </DeleteButton>
        </div>
      </div>
    </div>
  );
}
