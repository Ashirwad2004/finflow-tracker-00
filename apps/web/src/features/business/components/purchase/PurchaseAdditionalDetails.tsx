import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";

interface PurchaseAdditionalDetailsProps {
    notes: string;
    attachmentUrl?: string;
    onNotesChange: (val: string) => void;
    onAttachmentUrlChange?: (val: string) => void;
}

export const PurchaseAdditionalDetails = ({
    notes,
    attachmentUrl = "",
    onNotesChange,
    onAttachmentUrlChange,
}: PurchaseAdditionalDetailsProps) => {
    const [isExpanded, setIsExpanded] = useState(Boolean(notes || attachmentUrl));

    return (
        <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-sm space-y-3">
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-muted text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>Additional Details & Supplier Notes</span>
                    {notes && (
                        <span className="text-[10px] lowercase font-normal bg-primary/10 text-primary px-2 py-0.2 rounded-full">
                            Notes added
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-medium lowercase text-muted-foreground">
                    <span>{isExpanded ? "hide details" : "add notes & reference"}</span>
                    {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="pt-2 border-t border-border/60 grid grid-cols-1 md:grid-cols-12 gap-3 animate-in fade-in-0 duration-150">
                    {/* Notes Textarea */}
                    <div className="md:col-span-8 space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                            Supplier Terms & Remarks
                        </Label>
                        <textarea
                            value={notes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            rows={3}
                            placeholder="Add supplier credit terms, payment transaction ID, delivery vehicle / e-way bill remarks..."
                            className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            These notes will be stored on the purchase record for audit and vendor statements.
                        </p>
                    </div>

                    {/* Attachment / Ref URL */}
                    <div className="md:col-span-4 space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <LinkIcon className="w-3 h-3 text-muted-foreground" />
                            <span>Attachment / Bill File URL</span>
                        </Label>
                        <Input
                            type="url"
                            value={attachmentUrl}
                            onChange={(e) => onAttachmentUrlChange?.(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="h-9 text-xs bg-background"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Optional link to cloud storage or scanned vendor invoice.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
