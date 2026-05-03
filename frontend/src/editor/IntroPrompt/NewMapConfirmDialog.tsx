/**
 * NewMapConfirmDialog Component
 *
 * Dialog that confirms the user wants to start a new map and clear
 * the current editor state. Prevents accidental data loss.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NewMapConfirmDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Called when the dialog should open/close
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Called when user confirms they want to start a new map
   */
  onConfirm: () => void;
}

/**
 * Dialog component for confirming the user wants to start a new map.
 *
 * This dialog warns the user that their current level will be cleared
 * from the editor and any unsaved changes will be lost.
 *
 * @example
 * ```tsx
 * const [newMapConfirmOpen, setNewMapConfirmOpen] = useState(false);
 *
 * const handleConfirmNewMap = () => {
 *   clearAllState();
 * };
 *
 * return (
 *   <>
 *     <Button onClick={() => setNewMapConfirmOpen(true)}>
 *       ←New Map
 *     </Button>
 *     <NewMapConfirmDialog
 *       open={newMapConfirmOpen}
 *       onOpenChange={setNewMapConfirmOpen}
 *       onConfirm={handleConfirmNewMap}
 *     />
 *   </>
 * );
 * ```
 */
export const NewMapConfirmDialog: React.FC<NewMapConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new map?</DialogTitle>
          <DialogDescription>
            This will clear the current level from the editor. Any unsaved
            changes will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Yes, go back</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

NewMapConfirmDialog.displayName = "NewMapConfirmDialog";
