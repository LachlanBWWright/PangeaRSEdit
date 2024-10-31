import { Button } from "../components/Button";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";

export function EditorView({ data }: { data: ottoMaticLevel }) {
  return (
    <div className="flex-1">
      <div className="flex flex-row">
        <Button>Fences</Button>
      </div>
      <p>Test</p>
    </div>
  );
}
