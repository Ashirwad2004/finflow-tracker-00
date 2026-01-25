import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

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
    const [isLoading, setIsLoading] = useState(false);

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
                .select("business_name, gst_number, business_phone, business_address")
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
                    }
                });
        }
    }, [open, user, reset]);

    const updateBusinessDetailsMutation = useMutation({
        mutationFn: async (values: BusinessDetailsFormValues) => {
            if (!user) throw new Error("User not authenticated");

            const { error } = await supabase
                .from("profiles" as any)
                .update({
                    business_name: values.business_name,
                    gst_number: values.gst_number,
                    business_phone: values.business_phone,
                    business_address: values.business_address
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Business Details</DialogTitle>
                    <DialogDescription>
                        Enter your business information. This will be displayed on your invoices.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
