import { SCRIPTING_CONTRACT } from "./scriptContract";

export function ScriptReferenceGuidance({ gameId }: { gameId: string }) {
  const is2D = gameId === "MightyMike-Android";
  return (
    <details className="min-w-0 border-b border-slate-800 pb-3 text-xs text-slate-300">
      <summary className="cursor-pointer font-medium text-white">Item lifecycle, coordinates & examples</summary>
      <div className="mt-3 grid gap-3 break-words">
        <p>Custom item callbacks receive <code>self</code> and <code>ctx</code>; global hooks receive <code>ctx</code>. Use <code>self.handle</code> for object commands and <code>self.parameters</code> for configured item values.</p>
        <p>{is2D ? "Mighty Mike uses map/screen X/Y coordinates; Z is not a terrain axis." : "World positions use X/Z for the ground plane and Y for elevation. Coordinates and velocities use native game units. Terrain height queries can fail outside loaded terrain."} Use <code>ctx.deltaSeconds</code> for elapsed time in update callbacks.</p>
        <p><code>item.onTrigger(self, ctx)</code> returns gameplay results such as <code>{"{ handled = true, solid = false }"}</code>. The item lifecycle callback <code>item.onTriggerEnter(self, ctx)</code> observes contact and returns no gameplay result.</p>
        <p>Example health pickup callback: <code>{"function item.onPickupCollected(self, ctx) return { handled = true, consumePickup = true, healthDelta = 0.25 } end"}</code>. Apply this to an item with a pickup collision preset; ordinary decorations do not produce pickup collisions.</p>
        <p>Example update clock: <code>{"local state = pangea.object.state(self.handle); state.elapsed = (state.elapsed or 0) + ctx.deltaSeconds"}</code>. State belongs to the object; a handle must not be reused after streaming out or destruction.</p>
        <table className="w-full text-left">
          <caption className="mb-2 text-left font-medium text-white">Custom object lifecycle contract</caption>
          <thead><tr><th className="pr-3">Callback</th><th className="pr-3">State</th><th>Cleanup / handle</th></tr></thead>
          <tbody>{SCRIPTING_CONTRACT.objectEvents.map((event) => (
            <tr key={event.id} className="border-t border-slate-800">
              <td className="py-1 pr-3"><code>{event.handler}</code></td>
              <td className="pr-3">{event.statePolicy}</td>
              <td>{event.cleanup === "owner-resources" ? "Owned resources cleaned up" : "No automatic cleanup"}{event.invalidatesHandle ? "; handle invalidated" : "; handle retained"}</td>
            </tr>
          ))}</tbody>
        </table>
        <p>Command APIs ending in <code>Result</code> expose status and diagnostics. Validate code before preview; validation does not prove collision behavior or asset compatibility in a running level.</p>
      </div>
    </details>
  );
}
