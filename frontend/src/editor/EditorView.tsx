/**
 * EditorView - Main entry point for the level editor
 * 
 * This component delegates to game-specific EditorViews based on the current game type.
 * Each game has its own EditorView that composes the appropriate menus and features.
 */

import { GameEditorView } from "./gameViews/GameEditorView";
import type { EditorViewProps } from "./utils/editorViewTypes";

/**
 * Main EditorView that delegates to game-specific implementations
 */
export function EditorView(props: EditorViewProps) {
  return <GameEditorView {...props} />;
}
