import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { SelectedItem } from "../../../data/items/itemAtoms";
import {
  ItemType,
  itemTypeNames,
  ottoItemTypeParams,
} from "../../../data/items/ottoItemType";
import { parseU16, parseU8 } from "../../../utils/numberParsers";

export function ItemMenu({
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
      {itemData === null || itemData === undefined ? (
        <div className="h-20 px-2">
          <Button>Add New Item</Button>
        </div>
      ) : (
        <p>
          Item {itemData.type} ({itemTypeNames[itemData.type]}) ({itemData.x},
          {itemData.z})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {itemData !== null && itemData !== undefined && (
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
            <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2">
              <p>Flags ({ottoItemTypeParams[itemData.type].flags})</p>
              <input
                className="text-black"
                type="text"
                value={itemData.flags}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedItem === undefined) return;
                    data.Itms[1000].obj[selectedItem].flags = parseU16(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 0 ({ottoItemTypeParams[itemData.type].p0})</p>
              <input
                className="text-black"
                type="text"
                value={itemData.p0}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedItem === undefined) return;
                    data.Itms[1000].obj[selectedItem].p0 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 1 ({ottoItemTypeParams[itemData.type].p1})</p>
              <input
                className="text-black"
                type="text"
                value={itemData.p1}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedItem === undefined) return;
                    data.Itms[1000].obj[selectedItem].p1 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 2 ({ottoItemTypeParams[itemData.type].p2})</p>
              <input
                className="text-black"
                type="text"
                value={itemData.p2}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedItem === undefined) return;
                    data.Itms[1000].obj[selectedItem].p2 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 3 ({ottoItemTypeParams[itemData.type].p3})</p>
              <input
                className="text-black"
                type="text"
                value={itemData.p3}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedItem === undefined) return;
                    data.Itms[1000].obj[selectedItem].p3 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
            </div>
            <DeleteButton
              disabled={selectedItem === undefined}
              onClick={() => {
                if (selectedItem === undefined) return;
                setData((data) => {
                  delete data.Itms[1000].obj[selectedItem];
                });
                setSelectedItem(undefined);
              }}
            >
              Delete Item
            </DeleteButton>
          </>
        )}
      </div>
    </div>
  );
}