import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { ClickToAddItem, SelectedItem } from "../../../data/items/itemAtoms";
import {
  ItemType,
  itemTypeNames,
  ottoItemTypeParams,
} from "../../../data/items/ottoItemType";
import { parseU16, parseU8 } from "../../../utils/numberParsers";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectValue,
  SelectContent,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";

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
        <AddItemMenu />
      ) : (
        <p>
          Item {itemData.type} ({itemData.x},{itemData.z})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {itemData !== null && itemData !== undefined && (
          <>
            <Select
              value={itemData.type.toString() ?? ""}
              onValueChange={(e) => {
                const newItemType = parseInt(e);
                setData((data) => {
                  if (selectedItem === undefined) return;
                  data.Itms[1000].obj[selectedItem].type = newItemType;
                });
              }}
            >
              <SelectTrigger>
                <SelectValue>{itemTypeNames[itemData.type]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {itemValues.map((key) => (
                  <SelectItem
                    key={key}
                    className="text-black"
                    value={key.toString()}
                  >
                    {itemTypeNames[key as ItemType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-baseline">
              <p className="text-baseline align-text-bottom">
                Flags ({ottoItemTypeParams[itemData.type].flags})
              </p>
              <Input
                type="number"
                className="col-span-3"
                value={itemData.flags.toString()}
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
              <Input
                type="number"
                value={itemData.p0.toString()}
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
              <Input
                type="number"
                value={itemData.p1.toString()}
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
              <Input
                type="number"
                value={itemData.p2.toString()}
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
              <Input
                type="number"
                value={itemData.p3.toString()}
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
                  data.Itms[1000].obj.splice(selectedItem, 1);
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

function AddItemMenu() {
  const [clickToAddItem, setClickToAddItem] = useAtom(ClickToAddItem);
  useEffect(() => {
    return () => setClickToAddItem(undefined);
  }, []);

  const itemValues = Object.keys(ItemType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  if (clickToAddItem !== undefined)
    return (
      <>
        <Select
          value={itemTypeNames[clickToAddItem as ItemType]}
          onValueChange={(e) => {
            const newItemType = parseInt(e);
            setClickToAddItem(newItemType);
          }}
        >
          <SelectTrigger>
            <SelectValue>
              {itemTypeNames[clickToAddItem as ItemType]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {itemValues.map((key) => (
              <SelectItem
                key={key}
                className="text-black"
                value={key.toString()}
              >
                {itemTypeNames[key as ItemType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p>Click on the Canvas to add the selected item</p>
        <DeleteButton onClick={() => setClickToAddItem(undefined)}>
          Stop Adding Items
        </DeleteButton>
      </>
    );

  return <Button onClick={() => setClickToAddItem(0)}>Add Items</Button>;
}
