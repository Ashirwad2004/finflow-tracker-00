import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useAuth } from "@/core/lib/auth";

interface BusinessDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface BusinessDetailsFormValues {
    business_name: string;
    gst_number: string;
    business_phone: string;
    business_address: string;
}

export const BusinessDetailsDialog = ({ open, onOpenChange, onSuccess }: BusinessDetailsDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<BusinessDetailsFormValues>({
        defaultValues: {
            business_name: "",
            gst_number: "",
            business_phone: "",
            business_address: ""
        }
    });

    // Fetch existing business details when dialog opens
    useEffect(() => {
        if (open && user) {
            supabase
                .from("profiles" as any)
                .select("business_name, gst_number, business_phone, business_address, business_logo, signature_url")
                .eq("user_id", user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        reset({
                            business_name: (data as any).business_name || "",
                            gst_number: (data as any).gst_number || "",
                            business_phone: (data as any).business_phone || "",
                            business_address: (data as any).business_address || ""
                        });
                        setLogoPreview((data as any).business_logo || null);
                        setSignaturePreview((data as any).signature_url || null);
                    }
                });
        } else {
            setLogoFile(null);
            setLogoPreview(null);
            setSignatureFile(null);
            setSignaturePreview(null);
        }
    }, [open, user, reset]);

    const uploadImage = async (file: File, pathPrefix: string): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${pathPrefix}-${user?.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('business_assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('business_assets')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const updateBusinessDetailsMutation = useMutation({
        mutationFn: async (values: BusinessDetailsFormValues) => {
            if (!user) throw new Error("User not authenticated");

            let currentLogoUrl = logoPreview;
            if (logoFile) {
                currentLogoUrl = await uploadImage(logoFile, 'logo');
            }

            let currentSignatureUrl = signaturePreview;
            if (signatureFile) {
                currentSignatureUrl = await uploadImage(signatureFile, 'signature');
            }

            const { error } = await supabase
                .from("profiles" as any)
                .update({
                    business_name: values.business_name,
                    gst_number: values.gst_number,
                    business_phone: values.business_phone,
                    business_address: values.business_address,
                    business_logo: currentLogoUrl,
                    signature_url: currentSignatureUrl
                })
                .eq("user_id", user.id);

            if (error) throw error;
            return values;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            toast({
                title: "Business Details Saved",
                description: "Your business information has been updated successfully."
            });
            onOpenChange(false);
            if (onSuccess) {
                onSuccess();
            }
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const onSubmit = (data: BusinessDetailsFormValues) => {
        updateBusinessDetailsMutation.mutate(data);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "File too large", description: "Image must be less than 2MB", variant: "destructive" });
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        if (type === 'logo') {
            setLogoFile(file);
            setLogoPreview(previewUrl);
        } else {
            setSignatureFile(file);
            setSignaturePreview(previewUrl);
        }
    };

    const clearImage = (type: 'logo' | 'signature') => {
        if (type === 'logo') {
            setLogoFile(null);
            setLogoPreview(null);
            if (logoInputRef.current) logoInputRef.current.value = "";
        } else {
            setSignatureFile(null);
            setSignaturePreview(null);
            if (signatureInputRef.current) signatureInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Business Details</DialogTitle>
                    <DialogDescription>
                        Enter your business information. This will be displayed on your invoices.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Basic Details */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="business_name">
                                    Business Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="business_name"
                                    {...register("business_name", { required: "Business name is required" })}
                                    placeholder="Enter your business name"
                                />
                                {errors.business_name && (
                                    <span className="text-xs text-destructive">{errors.business_name.message}</span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gst_number">
                                    GST Number <span className="text-muted-foreground text-xs">(Optional)</span>
                                </Label>
                                <Input
                                    id="gst_number"
                                    {...register("gst_number")}
                                    placeholder="e.g., 22AAAAA0000A1Z5"
                                />
                                <p className="text-xs text-muted-foreground">Enter your GST number if applicable</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="business_phone">
                                    Phone Number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="business_phone"
                                    {...register("business_phone", {
                                        required: "Phone number is required",
                                        pattern: {
                                            value: /^[0-9]{10,}$/,
                                            message: "Please enter a valid phone number (minimum 10 digits)"
                                        }
                                    })}
                                    placeholder="Enter phone number"
                                    type="tel"
                                />
                                {errors.business_phone && (
                                    <span className="text-xs text-destructive">{errors.business_phone.message}</span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="business_address">
                                    Business Address <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="business_address"
                                    {...register("business_address", { required: "Business address is required" })}
                                    placeholder="Enter your complete business address"
                                    rows={3}
                                />
                                {errors.business_address && (
                                    <span className="text-xs text-destructive">{errors.business_address.message}</span>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Assets */}
                        <div className="space-y-6">
                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <Label>Company Logo</Label>
                                <p className="text-xs text-muted-foreground mb-2">Displayed at the top of invoices (Max 2MB)</p>
                                <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center relative min-h-[120px] bg-slate-50">
                                    {logoPreview ? (
                                        <>
                                            <div className="relative w-full h-24 flex items-center justify-center bg-white border rounded">
                                                <img src={logoPreview} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                onClick={() => clearImage('logo')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <div
                                            className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                            onClick={() => logoInputRef.current?.click()}
                                        >
                                            <Upload className="h-6 w-6 mb-2" />
                                            <span className="text-xs font-medium text-center">Click to upload logo</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={logoInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={(e) => handleFileChange(e, 'logo')}
                                    />
                                </div>
                            </div>

                            {/* Signature Upload */}
                            <div className="space-y-2">
                                <Label>Authorized Signature</Label>
                                <p className="text-xs text-muted-foreground mb-2">Displayed at the bottom of invoices (Max 2MB)</p>
                                <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center relative min-h-[120px] bg-slate-50">
                                    {signaturePreview ? (
                                        <>
                                            <div className="relative w-full h-24 flex items-center justify-center bg-white border rounded">
                                                <img src={signaturePreview} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                onClick={() => clearImage('signature')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <div
                                            className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                            onClick={() => signatureInputRef.current?.click()}
                                        >
                                            <Upload className="h-6 w-6 mb-2" />
                                            <span className="text-xs font-medium text-center">Click to upload signature</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={signatureInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={(e) => handleFileChange(e, 'signature')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={updateBusinessDetailsMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateBusinessDetailsMutation.isPending}>
                            {updateBusinessDetailsMutation.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Save Details
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
