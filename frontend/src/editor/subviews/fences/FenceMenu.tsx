import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom } from "jotai";
import { DeleteButton } from "../../../components/Button";
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
    <div>
      {fenceData ? (
        <>
          <p>
            Fence {selectedFence} ({fenceData.numNubs} points)
          </p>
          <div className="flex flex-row gap-2">
            <p>
              Fence Type {fenceTypeNames[fenceData.fenceType]} (
              {fenceData.fenceType})
            </p>
            {/* Fence type selection dropdown */}
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
          </div>
        </>
      ) : (
        <p>No Fence Selected</p>
      )}
      <DeleteButton
        disabled={selectedFence === undefined}
        onClick={() => {
          if (selectedFence === undefined) return;

          setData((data) => {
            data.Fenc[1000].obj.splice(selectedFence, 1);

            for (const nubKey of Object.keys(data.FnNb)) {
              console.log("nubKey", parseInt(nubKey));
              if (parseInt(nubKey) > selectedFence + NUB_KEY_BASE) {
                data.FnNb[parseInt(nubKey) - 1] = data.FnNb[parseInt(nubKey)];
              }
            }
          });
          setSelectedFence(undefined);
        }}
      >
        Delete Fence
      </DeleteButton>
    </div>
  );
}
