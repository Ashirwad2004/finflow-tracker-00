import React from "react";
import { Shield } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReturnImagePreviewDialogProps {
    imageUrl: string | null;
    onClose: () => void;
}

export const ReturnImagePreviewDialog: React.FC<ReturnImagePreviewDialogProps> = ({
    imageUrl,
    onClose,
}) => {
    return (
        <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 rounded-2xl flex flex-col items-center">
                <DialogHeader className="w-full pb-3 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        Return Product Verification Proof
                    </DialogTitle>
                </DialogHeader>
                
                {imageUrl && (
                    <div className="relative max-h-[60vh] w-full overflow-hidden rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 mt-4 flex items-center justify-center p-2">
                        <img 
                            src={imageUrl} 
                            alt="Return verification proof" 
                            className="object-contain w-full h-auto max-h-[50vh] rounded-lg shadow-md" 
                        />
                    </div>
                )}

                <DialogFooter className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex justify-end">
                    <Button 
                        onClick={onClose} 
                        className="rounded-xl h-10 px-6 font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                    >
                        Close Preview
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
