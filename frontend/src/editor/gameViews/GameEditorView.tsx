/**
 * Game Editor View Selector
 * 
 * Selects and renders the appropriate EditorView component based on game type.
 * This removes the need for game type checks within individual components.
 */

import { useAtomValue } from "jotai";
import { Game, Globals } from "@/data/globals/globals";
import type { EditorViewProps } from "../utils/editorViewTypes";
import { OttoMaticEditorView } from "./OttoMaticEditorView";
import { StandardEditorView } from "./StandardEditorView";
import { BugdomEditorView } from "./BugdomEditorView";
import { NanosaurEditorView } from "./NanosaurEditorView";

/**
 * Renders the appropriate game-specific EditorView based on current game type
 */
export function GameEditorView(props: EditorViewProps) {
  const globals = useAtomValue(Globals);

  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      return <OttoMaticEditorView {...props} />;

    case Game.BUGDOM:
      return <BugdomEditorView {...props} />;

    case Game.NANOSAUR:
      return <NanosaurEditorView {...props} />;

    // Standard games use StandardEditorView
    case Game.BUGDOM_2:
    case Game.NANOSAUR_2:
    case Game.CRO_MAG:
    case Game.BILLY_FRONTIER:
      return <StandardEditorView {...props} />;

    case Game.MIGHTY_MIKE:
      // MightyMike uses a different format - for now use standard
      return <StandardEditorView {...props} />;

    default:
      // Fallback to standard view
      return <StandardEditorView {...props} />;
  }
}
