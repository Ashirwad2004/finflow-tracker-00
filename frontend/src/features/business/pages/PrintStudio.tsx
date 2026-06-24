import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { Printer, LayoutTemplate, History, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { format } from "date-fns";
import { generateInvoicePDF, InvoiceDetails, InvoicePdfTheme } from "@/utils/generateInvoicePDF";
import { printThermalReceipt } from "@/utils/printThermalReceipt";
import { toast } from "sonner";

export type InvoiceTheme = InvoicePdfTheme | 'thermal';

const invoiceThemes: InvoiceTheme[] = [
    "corporate",
    "modern-dark",
    "minimal-white",
    "professional-green",
    "premium-gold",
    "creative-purple",
    "startup-gradient",
    "elegant-mono",
    "retail",
    "construction",
    "thermal"
];

const PrintStudioPage = () => {
    const { user } = useAuth();

    // Load saved template preference or default to corporate
    const [selectedTheme, setSelectedTheme] = useState<InvoiceTheme>("corporate");

    useEffect(() => {
        const savedTheme = localStorage.getItem("finflow_invoice_theme") as InvoiceTheme;
        if (savedTheme && invoiceThemes.includes(savedTheme)) {
            setSelectedTheme(savedTheme);
        }
    }, []);

    const handleThemeSelect = (theme: InvoiceTheme) => {
        setSelectedTheme(theme);
        localStorage.setItem("finflow_invoice_theme", theme);
        toast.success(`Default template changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
    };

    // Fetch Recent Sales to populate the "Print Recent" list
    const { data: recentSales = [], isLoading } = useQuery({
        queryKey: ["recent_sales_for_print", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("sales")
                .select("*")
                .eq("user_id", user?.id || "")
                .order("created_at", { ascending: false })
                .limit(10); // Last 10 sales

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("*")
                .eq("user_id", user?.id || "")
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const handlePrintSale = async (sale: any) => {
        const invoiceDetails: InvoiceDetails = {
            invoice_number: sale.invoice_number || `INV-${sale.id.slice(0, 6).toUpperCase()}`,
            date: sale.created_at,
            customer_name: sale.customer_name,
            customer_phone: sale.customer_phone,
            customer_email: sale.customer_email,
            customer_gstin: sale.customer_gstin,
            items: sale.items || [],
            subtotal: sale.subtotal || sale.total_amount,
            discount_amount: sale.discount_amount || 0,
            tax_rate: sale.tax_rate || 0,
            tax_amount: sale.tax_amount || 0,
            total_amount: sale.total_amount,
            business_details: profile ? {
                name: profile.business_name || profile.display_name || "My Business",
                address: profile.business_address || undefined,
                phone: profile.business_phone || profile.phone || undefined,
                gst: profile.gst_number || undefined,
                logo_url: profile.business_logo || undefined,
                signature_url: profile.signature_url || undefined,
            } : undefined
        };

        if (selectedTheme === 'thermal') {
            toast.success(`Preparing thermal receipt ${invoiceDetails.invoice_number}...`);
            await printThermalReceipt(invoiceDetails);
        } else {
            toast.success(`Preparing invoice ${invoiceDetails.invoice_number}...`);
            await generateInvoicePDF(invoiceDetails, { action: 'download', theme: selectedTheme as InvoicePdfTheme });
        }
    };

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8 animate-fade-in max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                        <Printer className="w-8 h-8 text-primary" />
                        Print Studio
                    </h1>
                    <p className="text-muted-foreground">Select your invoice design and quickly print recent sales.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Template Selection */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card rounded-xl border shadow-sm p-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                                <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
                                Invoice Templates
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                                {/* Corporate Blue Theme */}
                                <div
                                    onClick={() => handleThemeSelect("corporate")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'corporate' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'corporate' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-slate-50 relative p-4 pointer-events-none">
                                        <div className="w-full h-8 bg-blue-600 rounded-sm mb-4"></div>
                                        <div className="flex justify-between mb-4">
                                            <div className="w-1/2 space-y-1">
                                                <div className="w-16 h-2 bg-slate-300 rounded"></div>
                                                <div className="w-24 h-2 bg-slate-200 rounded"></div>
                                            </div>
                                            <div className="w-16 h-4 bg-slate-300 rounded"></div>
                                        </div>
                                        <div className="w-full h-24 border border-slate-200 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-blue-600/10 border-b border-slate-200"></div>
                                            <div className="w-full h-4 border-b border-slate-100 mt-2"></div>
                                            <div className="w-full h-4 border-b border-slate-100 mt-2"></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="w-24 h-12 bg-slate-100 border border-slate-200 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Corporate Blue</div>
                                </div>

                                {/* Modern Dark Theme */}
                                <div
                                    onClick={() => handleThemeSelect("modern-dark")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'modern-dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'modern-dark' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-slate-950 relative p-4 pointer-events-none border border-slate-800">
                                        <div className="w-full h-8 bg-slate-900 rounded-sm mb-4 border-b border-cyan-500/30"></div>
                                        <div className="flex justify-between mb-4">
                                            <div className="w-1/2 space-y-1">
                                                <div className="w-16 h-2 bg-slate-700 rounded"></div>
                                                <div className="w-24 h-2 bg-slate-800 rounded"></div>
                                            </div>
                                            <div className="w-16 h-4 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-400"></div>
                                        </div>
                                        <div className="w-full h-24 border border-slate-800 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-cyan-950/20 border-b border-slate-800"></div>
                                            <div className="w-full h-4 border-b border-slate-900 mt-2"></div>
                                            <div className="w-full h-4 border-b border-slate-900 mt-2"></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="w-24 h-12 bg-slate-900 border border-slate-800 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Modern Dark</div>
                                </div>

                                {/* Minimal White Theme */}
                                <div
                                    onClick={() => handleThemeSelect("minimal-white")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'minimal-white' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'minimal-white' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-white relative p-4 pointer-events-none border border-slate-200">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="w-16 h-4 bg-slate-900 rounded-sm"></div>
                                            <div className="w-12 h-2 bg-slate-400 rounded-sm"></div>
                                        </div>
                                        <div className="w-full h-[1px] bg-slate-900 mb-4"></div>
                                        <div className="w-24 h-2 bg-slate-850 rounded mb-1"></div>
                                        <div className="w-32 h-1.5 bg-slate-400 rounded mb-6"></div>
                                        <div className="w-full space-y-2 mb-6">
                                            <div className="w-full h-3 border-b border-slate-900"></div>
                                            <div className="w-full h-3 border-b border-slate-200"></div>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-slate-900 pt-2">
                                            <div className="w-16 h-2 bg-slate-400 rounded"></div>
                                            <div className="w-20 h-4 bg-slate-900 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Minimal White</div>
                                </div>

                                {/* Professional Green Theme */}
                                <div
                                    onClick={() => handleThemeSelect("professional-green")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'professional-green' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'professional-green' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-slate-50 relative p-4 pointer-events-none">
                                        <div className="w-full h-8 bg-emerald-750 bg-emerald-700 rounded-sm mb-4"></div>
                                        <div className="flex justify-between mb-4">
                                            <div className="w-1/2 space-y-1">
                                                <div className="w-16 h-2 bg-slate-300 rounded"></div>
                                                <div className="w-24 h-2 bg-slate-200 rounded"></div>
                                            </div>
                                            <div className="w-16 h-4 bg-emerald-800/10 rounded"></div>
                                        </div>
                                        <div className="w-full h-24 border border-slate-200 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-emerald-700/10 border-b border-slate-200"></div>
                                            <div className="w-full h-4 border-b border-slate-100 mt-2"></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="w-24 h-12 bg-slate-100 border border-slate-200 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Professional Green</div>
                                </div>

                                {/* Premium Gold Theme */}
                                <div
                                    onClick={() => handleThemeSelect("premium-gold")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'premium-gold' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'premium-gold' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-stone-50 relative p-4 pointer-events-none border border-amber-100">
                                        <div className="w-full h-1 bg-amber-600 mb-4"></div>
                                        <div className="flex justify-between mb-4">
                                            <div className="w-1/2 space-y-1">
                                                <div className="w-16 h-2 bg-amber-900/40 rounded"></div>
                                                <div className="w-24 h-1.5 bg-slate-300 rounded"></div>
                                            </div>
                                            <div className="w-16 h-5 bg-amber-900/10 rounded border border-amber-600/30"></div>
                                        </div>
                                        <div className="w-full h-24 border border-amber-100 bg-amber-50/10 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-amber-600/10 border-b border-amber-200"></div>
                                            <div className="w-full h-4 border-b border-amber-100/50 mt-2"></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="w-24 h-12 bg-amber-50/30 border border-amber-200/50 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Premium Gold</div>
                                </div>

                                {/* Creative Purple Theme */}
                                <div
                                    onClick={() => handleThemeSelect("creative-purple")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'creative-purple' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'creative-purple' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-slate-50 relative p-4 pointer-events-none">
                                        <div className="w-full h-8 bg-violet-600 rounded-sm mb-4"></div>
                                        <div className="flex justify-between mb-4">
                                            <div className="w-1/2 space-y-1">
                                                <div className="w-16 h-2 bg-slate-300 rounded"></div>
                                                <div className="w-24 h-2 bg-slate-200 rounded"></div>
                                            </div>
                                            <div className="w-16 h-4 bg-violet-600/10 rounded"></div>
                                        </div>
                                        <div className="w-full h-24 border border-violet-100 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-violet-600/10 border-b border-violet-200"></div>
                                            <div className="w-full h-4 border-b border-slate-100 mt-2"></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="w-24 h-12 bg-violet-50/50 border border-violet-200 rounded-md"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Creative Purple</div>
                                </div>

                                {/* Startup Gradient Theme */}
                                <div
                                    onClick={() => handleThemeSelect("startup-gradient")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'startup-gradient' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'startup-gradient' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-slate-50 relative p-4 pointer-events-none">
                                        <div className="w-full h-8 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-sm mb-4"></div>
                                        <div className="flex justify-between mb-4">
                                            <div className="w-1/2 space-y-1">
                                                <div className="w-16 h-2 bg-slate-300 rounded"></div>
                                                <div className="w-24 h-2 bg-slate-200 rounded"></div>
                                            </div>
                                            <div className="w-16 h-4 bg-indigo-500/10 rounded"></div>
                                        </div>
                                        <div className="w-full h-24 border border-slate-200 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-gradient-to-r from-indigo-500/10 to-pink-500/10 border-b border-slate-200"></div>
                                            <div className="w-full h-4 border-b border-slate-100 mt-2"></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="w-24 h-12 bg-slate-100 border border-slate-200 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Startup Gradient</div>
                                </div>

                                {/* Elegant Black & White Theme */}
                                <div
                                    onClick={() => handleThemeSelect("elegant-mono")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'elegant-mono' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'elegant-mono' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-white relative p-4 pointer-events-none border border-slate-200">
                                        <div className="text-center font-serif text-[10px] tracking-widest border-b-2 border-double border-slate-900 pb-2 mb-4 font-bold">INVOICE</div>
                                        <div className="flex justify-between mb-4">
                                            <div className="w-1/2 space-y-1">
                                                <div className="w-16 h-2 bg-slate-800 rounded-sm"></div>
                                                <div className="w-24 h-1.5 bg-slate-500 rounded-sm"></div>
                                            </div>
                                            <div className="w-14 h-4 bg-slate-900 rounded-sm"></div>
                                        </div>
                                        <div className="w-full h-24 border border-slate-300 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-slate-100 border-b-2 border-double border-slate-900"></div>
                                            <div className="w-full h-4 border-b border-slate-200 mt-2"></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="w-24 h-10 border-t border-b-2 border-slate-950 pt-1"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Elegant B&W</div>
                                </div>

                                {/* Retail Store Theme */}
                                <div
                                    onClick={() => handleThemeSelect("retail")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'retail' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'retail' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-[#fdfdfd] relative pointer-events-none">
                                        <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-blue-50/50 border-l border-blue-100/30"></div>
                                        <div className="p-4 relative z-10">
                                            <div className="w-20 h-4 bg-sky-500 rounded-sm mb-6"></div>
                                            <div className="flex justify-between mb-6">
                                                <div className="w-1/2 space-y-1">
                                                    <div className="w-12 h-2 bg-slate-400 rounded"></div>
                                                    <div className="w-20 h-2 bg-slate-800 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="w-1/2 space-y-2 mb-6">
                                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                                    <div className="w-16 h-2 bg-slate-400 rounded"></div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <div className="w-24 h-2 bg-slate-800 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="w-full items-end flex flex-col pt-4">
                                                <div className="w-24 h-6 border-b-2 border-sky-600 rounded-sm bg-sky-50"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Retail Store</div>
                                </div>

                                {/* Construction & Engineering Theme */}
                                <div
                                    onClick={() => handleThemeSelect("construction")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'construction' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'construction' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-white relative p-4 pointer-events-none border border-slate-400">
                                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-600"></div>
                                        <div className="flex justify-between items-center mb-4 mt-2">
                                            <div className="w-16 h-4 bg-slate-900 rounded-sm"></div>
                                            <div className="w-24 h-3 bg-orange-600/10 text-orange-600 border border-orange-600/30 rounded-sm"></div>
                                        </div>
                                        <div className="w-full h-px bg-slate-400 mb-4"></div>
                                        <div className="w-full h-24 border border-slate-400 rounded-sm mb-4">
                                            <div className="w-full h-4 bg-orange-600/10 border-b border-slate-400"></div>
                                            <div className="w-full h-4 border-b border-slate-100 mt-2"></div>
                                        </div>
                                        <div className="flex justify-between items-center mt-6">
                                            <div className="w-16 h-3 bg-slate-200"></div>
                                            <div className="w-20 h-5 border-t border-slate-900"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Construction</div>
                                </div>

                                {/* Thermal POS Theme */}
                                <div
                                    onClick={() => handleThemeSelect("thermal")}
                                    className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedTheme === 'thermal' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                                >
                                    {selectedTheme === 'thermal' && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10 shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="aspect-[1/1.4] bg-[#f8f8f8] relative p-4 pointer-events-none flex justify-center shadow-inner">
                                        <div className="w-5/6 h-full bg-white shadow-sm border border-slate-200 flex flex-col items-center p-2 font-mono" style={{ filter: 'grayscale(100%)' }}>
                                            <div className="w-12 h-2 bg-slate-800 rounded-sm mb-1"></div>
                                            <div className="w-16 h-1 bg-slate-400 rounded-sm mb-2"></div>
                                            <div className="w-full border-b border-dashed border-slate-400 mb-2"></div>
                                            <div className="w-full space-y-1 mb-2">
                                                <div className="flex justify-between">
                                                    <div className="w-10 h-1 bg-slate-500"></div>
                                                    <div className="w-8 h-1 bg-slate-500"></div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <div className="w-12 h-1 bg-slate-500"></div>
                                                    <div className="w-6 h-1 bg-slate-500"></div>
                                                </div>
                                            </div>
                                            <div className="w-full border-b border-dashed border-slate-400 mb-2"></div>
                                            <div className="flex justify-between w-full mb-1">
                                                <div className="w-8 h-1 bg-slate-800"></div>
                                                <div className="w-6 h-1 bg-slate-800"></div>
                                            </div>
                                            <div className="w-full border-b border-dashed border-slate-400 mb-4"></div>
                                            <div className="flex gap-1 mb-2">
                                                <div className="w-1 h-3 bg-slate-800"></div>
                                                <div className="w-2 h-3 bg-slate-800"></div>
                                                <div className="w-1 h-3 bg-slate-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-card border-t text-center font-medium">Thermal POS</div>
                                </div>

                            </div>
                            <p className="text-sm text-muted-foreground mt-4 text-center">
                                Tip: The template you select here is automatically saved and applied when printing directly from the Sales page.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Quick Print History */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-xl border shadow-sm flex flex-col h-full">
                            <div className="p-4 border-b">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <History className="w-5 h-5 text-muted-foreground" />
                                    Quick Print
                                </h2>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full h-14 bg-muted animate-pulse rounded-md" />)}
                                    </div>
                                ) : recentSales.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No recent sales found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentSales.map((sale: any) => (
                                            <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-medium text-sm truncate">{sale.customer_name}</p>
                                                    <p className="text-xs text-muted-foreground">{format(new Date(sale.created_at), "MMM d, yyyy")}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handlePrintSale(sale)}
                                                    className="shrink-0"
                                                >
                                                    Print
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
};

export default PrintStudioPage;
