import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { ItemType, itemTypeNames } from "../../../data/items/ottoItemType";

export default function ItemMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedItem, setSelectedItem] = useAtom(SelectedItem);

  const itemData =
    selectedItem !== undefined ? data.Itms[1000].obj[selectedItem] : null;

  const itemValues = Object.keys(ItemType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  return (
    <div className="flex flex-col gap-2">
      {itemData === null ? (
        <div className="h-20 px-2">
          <Button>Add New Item</Button>
        </div>
      ) : (
        <p>
          Item {itemTypeNames[itemData.type]} {selectedItem}
        </p>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-2 w-full">
        <div className="flex flex-col">
          {itemData !== null && (
            <>
              <select
                value={itemData.type}
                className="text-black"
                onChange={(e) => {
                  const newItemType = parseInt(e.target.value);
                  setData((data) => {
                    if (selectedItem === undefined) return;
                    data.Itms[1000].obj[selectedItem].type = newItemType;
                  });
                }}
              >
                {itemValues.map((key) => (
                  <option key={key} className="text-black" value={key}>
                    {itemTypeNames[key as ItemType]}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {itemData && (
          <div className="flex flex-col gap-2">
            <Button disabled={selectedItem === undefined}>Add Front Nub</Button>
            <Button disabled={selectedItem === undefined}>Add Back Nub</Button>
            <DeleteButton disabled={selectedItem === undefined}>
              Delete Fence
            </DeleteButton>
          </div>
        )}
      </div>
    </div>
  );
}
