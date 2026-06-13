import { useState, useRef, useCallback } from "react";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";

interface ProductImageUploadProps {
    /** Current image URL (from DB / form state) */
    value: string | undefined;
    /** Called with the new public URL after upload, or "" on removal */
    onChange: (url: string) => void;
    /** Optional label prefix, defaults to "Product Image" */
    label?: string;
    /** Input id for accessibility */
    inputId?: string;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 5;

export function ProductImageUpload({
    value,
    onChange,
    label = "Product Image",
    inputId = "product_image_upload",
}: ProductImageUploadProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const upload = useCallback(
        async (file: File) => {
            if (!user) return;

            // Validate type
            if (!ACCEPTED.includes(file.type)) {
                toast({
                    title: "Unsupported file type",
                    description: "Please upload a JPEG, PNG, WebP, or GIF image.",
                    variant: "destructive",
                });
                return;
            }

            // Validate size
            if (file.size > MAX_MB * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: `Maximum file size is ${MAX_MB} MB.`,
                    variant: "destructive",
                });
                return;
            }

            setUploading(true);
            try {
                // Use user_id as folder so RLS foldername() check passes
                const ext = file.name.split(".").pop() ?? "jpg";
                const filename = `${user.id}/${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from("product-images")
                    .upload(filename, file, { upsert: true, contentType: file.type });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from("product-images")
                    .getPublicUrl(filename);

                onChange(data.publicUrl);
                toast({ title: "Image uploaded successfully" });
            } catch (err: any) {
                console.error("[ProductImageUpload] upload error:", err);
                toast({
                    title: "Upload failed",
                    description: err?.message ?? "Something went wrong. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setUploading(false);
            }
        },
        [user, onChange, toast]
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
        // Reset input so the same file can be re-selected after removal
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
    };

    const handleRemove = () => {
        onChange("");
        if (inputRef.current) inputRef.current.value = "";
    };

    const hasImage = !!value;

    return (
        <div className="space-y-2">
            <Label htmlFor={inputId}>{label}</Label>

            {hasImage ? (
                /* ── Preview ── */
                <div className="relative w-full h-40 rounded-lg border overflow-hidden group bg-muted">
                    <img
                        src={value}
                        alt="Product"
                        className="w-full h-full object-cover"
                        onError={e => {
                            (e.currentTarget as HTMLImageElement).src =
                                "https://placehold.co/400x300/f1f5f9/94a3b8?text=No+Image";
                        }}
                    />
                    {/* overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                        >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Replace
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={handleRemove}
                            disabled={uploading}
                        >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Remove
                        </Button>
                    </div>
                    {uploading && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    )}
                </div>
            ) : (
                /* ── Drop zone ── */
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload product image"
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !uploading && inputRef.current?.click()}
                    onKeyDown={e => e.key === "Enter" && !uploading && inputRef.current?.click()}
                    className={`
                        flex flex-col items-center justify-center gap-3 w-full h-36 rounded-lg border-2 border-dashed
                        cursor-pointer transition-all duration-150 select-none
                        ${dragOver
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                        }
                        ${uploading ? "pointer-events-none opacity-60" : ""}
                    `}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Uploading…</span>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    Click to upload <span className="text-muted-foreground font-normal">or drag & drop</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    PNG, JPG, WebP or GIF · Max {MAX_MB} MB
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={ACCEPTED.join(",")}
                className="sr-only"
                onChange={handleFileChange}
                aria-hidden="true"
            />
        </div>
    );
}
