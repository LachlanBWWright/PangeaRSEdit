import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoadingImageEditorDialogProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

export function LoadingImageEditorDialog({
  isOpen,
  onRequestClose,
}: LoadingImageEditorDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onRequestClose();
      }}
    >
      <DialogContent className="max-w-4xl h-[80vh] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            Loading Image Editor...
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading image...</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
