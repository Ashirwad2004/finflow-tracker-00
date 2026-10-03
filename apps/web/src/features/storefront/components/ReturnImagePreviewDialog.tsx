import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReturnImagePreviewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ReturnImagePreviewDialog({ imageUrl, onClose }: ReturnImagePreviewDialogProps) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col items-center">
        <DialogHeader className="w-full pb-3 border-b">
          <DialogTitle className="text-base font-bold">Return Product Verification Photo</DialogTitle>
        </DialogHeader>
        {imageUrl && (
          <div className="relative max-h-[70vh] w-full overflow-hidden rounded-xl border border-border bg-muted mt-4">
            <img
              src={imageUrl}
              alt="Return product proof fullscreen"
              className="object-contain w-full h-auto max-h-[60vh] mx-auto"
            />
          </div>
        )}
        <DialogFooter className="w-full pt-4 border-t mt-4 flex justify-end">
          <Button onClick={onClose} className="rounded-xl h-10 px-6 font-bold">
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
