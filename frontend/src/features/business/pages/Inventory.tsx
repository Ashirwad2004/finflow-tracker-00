import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Package, AlertCircle, Settings2, Info, Globe, Sparkles, Loader2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { TableLoadingRows } from "@/components/shared/PageStates";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useItemSettings } from "@/core/hooks/use-item-settings";
import { useProductsRealtime } from "@/core/hooks/useProductsRealtime";
import { ProductImageUpload } from "@/features/business/components/ProductImageUpload";
import { ExcelImportDialog } from "@/features/business/components/ExcelImportDialog";
import { generateProductContent } from "@/core/integrations/ai/gemini";

interface Product {
    id: string;
    user_id: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    created_at: string;
    updated_at?: string;
    is_listed_online?: boolean;
    online_description?: string;
    image_url?: string;
}

interface ProductFormValues {
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    is_listed_online?: boolean;
    online_description?: string;
    image_url?: string;
}

type SupabaseProductSelect = {
    from: (table: string) => {
        select: (columns: string) => Promise<{ data: Product[] | null; error: unknown }>;
    };
};

export default function Inventory() {
    const { user } = useAuth();
    const userId = user?.id || "";
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const { settings, updateSetting, resetSettings } = useItemSettings(user?.id);

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isGeneratingProductCopy, setIsGeneratingProductCopy] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, watch, control, setValue, getValues } = useForm<ProductFormValues>({
        defaultValues: {
            name: "",
            price: 0,
            cost_price: 0,
            stock_quantity: 0,
            unit: "pc",
            is_listed_online: false,
            online_description: "",
            image_url: ""
        }
    });

    useProductsRealtime(user?.id);

    // Fetch products
    const { data: products = [], isLoading } = useQuery({
        queryKey: ["products", userId],
        queryFn: async () => {
            const response = await (supabase as unknown as SupabaseProductSelect).from("products").select("*");
            const { data, error } = response;

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!user
    });

    // Filter products based on search
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Add product mutation
    const addProductMutation = useMutation({
        mutationFn: async (values: ProductFormValues) => {
            const recordId = uuidv4();
            const recordPayload: Product = {
                id: recordId,
                user_id: userId,
                ...values,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const result = await offlineMutate({
                table: "products",
                action: "insert",
                recordId,
                payload: recordPayload,
                userId: user?.id || ""
            });
            if (result.error) throw result.error;
            return recordPayload;
        },
        onSuccess: (newProduct: Product) => {
            // Optimistically update React Query Cache
            queryClient.setQueryData<Product[]>(["products", user?.id || ""], (old) => {
                return [newProduct, ...(old || [])];
            });
            queryClient.invalidateQueries({ queryKey: ["products", user?.id || ""] });
            toast({
                title: "Product Added",
                description: "The product has been added to your inventory."
            });
            setIsAddDialogOpen(false);
            reset();
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    // Update product mutation
    const updateProductMutation = useMutation({
        mutationFn: async (values: ProductFormValues) => {
            if (!selectedProduct) throw new Error("No product selected.");
            const recordPayload: Product = {
                ...selectedProduct,
                ...values,
                updated_at: new Date().toISOString()
            };
            const result = await offlineMutate({
                table: "products",
                action: "update",
                recordId: selectedProduct.id,
                payload: recordPayload,
                userId: user?.id || ""
            });
            if (result.error) throw result.error;
            return recordPayload;
        },
        onSuccess: (updatedProduct: Product) => {
            // Optimistically update React Query Cache
            queryClient.setQueryData<Product[]>(["products", user?.id || ""], (old) => {
                if (!old) return [];
                return old.map(p => p.id === updatedProduct.id ? updatedProduct : p);
            });
            queryClient.invalidateQueries({ queryKey: ["products", user?.id || ""] });
            toast({
                title: "Product Updated",
                description: "The product has been updated successfully."
            });
            setIsEditDialogOpen(false);
            setSelectedProduct(null);
            reset();
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    // Delete product mutation
    const deleteProductMutation = useMutation({
        mutationFn: async (productId: string) => {
            const productToDelete = products.find(p => p.id === productId);
            if (productToDelete) {
                const deletedItem = {
                    ...productToDelete,
                    type: "product",
                    deleted_at: new Date().toISOString()
                };
                const key = `recently_deleted_products_${user?.id}`;
                const existingStr = localStorage.getItem(key);
                const existing = existingStr ? JSON.parse(existingStr) : [];
                localStorage.setItem(key, JSON.stringify([deletedItem, ...existing]));
            }

            const result = await offlineMutate({
                table: "products",
                action: "delete",
                recordId: productId,
                payload: {},
                userId: user?.id || ""
            });
            if (result.error) throw result.error;
            return productId;
        },
        onSuccess: (deletedId: string) => {
            // Optimistically update React Query Cache
            queryClient.setQueryData<Product[]>(["products", user?.id || ""], (old) => {
                if (!old) return [];
                return old.filter(p => p.id !== deletedId);
            });
            queryClient.invalidateQueries({ queryKey: ["products", user?.id || ""] });
            toast({
                title: "Product Deleted",
                description: "The product has been removed from your inventory."
            });
            setIsDeleteDialogOpen(false);
            setSelectedProduct(null);
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        reset({
            name: product.name,
            price: product.price,
            cost_price: product.cost_price,
            stock_quantity: product.stock_quantity,
            unit: product.unit,
            is_listed_online: product.is_listed_online || false,
            online_description: product.online_description || "",
            image_url: product.image_url || ""
        });
        setIsEditDialogOpen(true);
    };

    const handleDelete = (product: Product) => {
        setSelectedProduct(product);
        setIsDeleteDialogOpen(true);
    };

    const onAddSubmit = (data: ProductFormValues) => {
        const isDuplicate = products.some(
            (p) => p.name.trim().toLowerCase() === data.name.trim().toLowerCase()
        );
        if (isDuplicate) {
            toast({
                title: "Duplicate Product",
                description: `A product named "${data.name.trim()}" already exists in your inventory.`,
                variant: "destructive"
            });
            return;
        }
        addProductMutation.mutate(data);
    };

    const onEditSubmit = (data: ProductFormValues) => {
        const isDuplicate = products.some(
            (p) =>
                p.id !== selectedProduct?.id &&
                p.name.trim().toLowerCase() === data.name.trim().toLowerCase()
        );
        if (isDuplicate) {
            toast({
                title: "Duplicate Product",
                description: `A product named "${data.name.trim()}" already exists in your inventory.`,
                variant: "destructive"
            });
            return;
        }
        updateProductMutation.mutate(data);
    };

    const handleGenerateProductCopy = async () => {
        const values = getValues();
        if (!values.name?.trim()) {
            toast({
                title: "Product name required",
                description: "Enter a product name first so Gemini can generate relevant content.",
                variant: "destructive"
            });
            return;
        }

        setIsGeneratingProductCopy(true);
        try {
            const content = await generateProductContent({
                name: values.name,
                price: Number(values.price || 0),
                costPrice: Number(values.cost_price || 0),
                unit: values.unit,
                stockQuantity: Number(values.stock_quantity || 0),
            });
            setValue("name", content.title, { shouldDirty: true, shouldValidate: true });
            setValue(
                "online_description",
                `${content.description}\n\nHighlights:\n${content.highlights.map((item) => `- ${item}`).join("\n")}\n\n${content.marketingCopy}\n\nSEO Title: ${content.seoTitle}\nSEO Description: ${content.seoDescription}`,
                { shouldDirty: true, shouldValidate: true }
            );
            toast({
                title: "Gemini product copy generated",
                description: "Review the title, description, SEO metadata, highlights, and marketing copy before saving."
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Please try again later.";
            toast({
                title: "Gemini generation failed",
                description: message,
                variant: "destructive"
            });
        } finally {
            setIsGeneratingProductCopy(false);
        }
    };

    const lowStockThreshold = settings.lowStockWarningThreshold;
    const lowStockCount = lowStockThreshold > 0
        ? products.filter(p => p.stock_quantity < lowStockThreshold).length
        : 0;

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <Package className="w-8 h-8 shrink-0" />
                            Inventory Management
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                            Manage your products and stock levels
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="gap-2 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">
                            <Settings2 className="w-4 h-4" />
                            Item Settings
                        </Button>
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">
                            <FileSpreadsheet className="w-4 h-4" />
                            Import / Export
                        </Button>
                        <Button onClick={() => setIsAddDialogOpen(true)} className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">
                            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                            Add Product
                        </Button>
                    </div>
                </div>

                {lowStockCount > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <div>
                            <p className="font-medium text-orange-900 dark:text-orange-100">
                                Low Stock Alert
                            </p>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                                {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} {lowStockCount !== 1 ? 'are' : 'is'} running low on stock (less than {lowStockThreshold} units)
                            </p>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Products Table */}
                <div className="border rounded-lg overflow-x-auto bg-card">
                    {isLoading ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Cost Price</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableLoadingRows cols={6} rows={5} />
                            </TableBody>
                        </Table>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                            <p className="text-muted-foreground mb-4">
                                {searchTerm ? "No products match your search." : "Add your first product to get started!"}
                            </p>
                            {!searchTerm && (
                                <Button onClick={() => setIsAddDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Product
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Cost Price</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {product.name}
                                                {product.is_listed_online && (
                                                    <Globe className="w-4 h-4 text-blue-500" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatCurrency(product.price)}</TableCell>
                                        <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{product.stock_quantity}</span>
                                                {product.stock_quantity < lowStockThreshold && lowStockThreshold > 0 && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Low Stock
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.unit}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(product)}
                                                title={`Edit ${product.name}`}
                                                aria-label={`Edit ${product.name}`}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(product)}
                                                className="text-destructive"
                                                title={`Delete ${product.name}`}
                                                aria-label={`Delete ${product.name}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Item Settings Dialog */}
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-primary" />
                                Item Settings
                            </DialogTitle>
                            <DialogDescription>
                                Configure how items behave across sales and inventory tracking.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-1 py-2">
                            {/* Section: Stock Control */}
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Stock Control</p>

                            {/* Stop Sale on Negative Stock */}
                            <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
                                settings.stopSaleOnNegativeStock
                                    ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            }`}> 
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Stop Sale on Negative Stock</p>
                                        {settings.stopSaleOnNegativeStock && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Block invoice creation when an item's sold quantity exceeds current stock. Prevents selling items you don't have.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.stopSaleOnNegativeStock}
                                    onCheckedChange={(value) => updateSetting("stopSaleOnNegativeStock", value)}
                                    aria-label="Toggle stop sale on negative stock"
                                />
                            </div>

                            {/* Low Stock Threshold */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-3">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Low Stock Warning Threshold</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Show a low stock badge when quantity falls below this number. Set to 0 to disable.
                                    </p>
                                </div>
                                <div className="flex flex-col">
                                    <Label htmlFor="low_stock_warning_threshold" className="sr-only">
                                        Low stock warning threshold
                                    </Label>
                                    <input
                                        id="low_stock_warning_threshold"
                                        type="number"
                                        min={0}
                                        max={9999}
                                        aria-label="Low stock warning threshold"
                                        title="Low stock warning threshold"
                                        value={settings.lowStockWarningThreshold}
                                        onChange={(e) => updateSetting("lowStockWarningThreshold", Math.max(0, Number(e.target.value)))}
                                        className="w-20 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Section: Invoice Behaviour */}
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-5 mb-3">Invoice Behaviour</p>

                            {/* Deduct Stock Only on Paid */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Deduct Stock Only on Paid Invoices</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        When enabled, stock is only reduced when an invoice is marked as Paid — not for Pending or Draft invoices.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.deductStockOnlyOnPaid}
                                    onCheckedChange={(value) => updateSetting("deductStockOnlyOnPaid", value)}
                                    aria-label="Toggle deduct stock only on paid invoices"
                                />
                            </div>

                            {/* Section: Display */}
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-5 mb-3">Display</p>

                            {/* Show stock in item picker */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Show Stock in Item Picker</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Display available stock count next to each item when adding lines to an invoice.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.showStockInItemPicker}
                                    onCheckedChange={(value) => updateSetting("showStockInItemPicker", value)}
                                    aria-label="Toggle show stock in item picker"
                                />
                            </div>

                            {/* Info note */}
                            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                    All settings are saved automatically and apply immediately across your account.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="ghost" size="sm" onClick={resetSettings} className="text-slate-500 mr-auto">
                                Reset to Defaults
                            </Button>
                            <Button onClick={() => setIsSettingsOpen(false)}>
                                Done
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Product Dialog */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Product</DialogTitle>
                            <DialogDescription>
                                Add a new product to your inventory
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name *</Label>
                                <Input
                                    id="name"
                                    {...register("name", { required: "Product name is required" })}
                                    placeholder="Enter product name"
                                />
                                {errors.name && (
                                    <span className="text-xs text-destructive">{errors.name.message}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Selling Price *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        {...register("price", { required: "Price is required", min: 0 })}
                                        placeholder="0.00"
                                    />
                                    {errors.price && (
                                        <span className="text-xs text-destructive">{errors.price.message}</span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cost_price">Cost Price</Label>
                                    <Input
                                        id="cost_price"
                                        type="number"
                                        step="0.01"
                                        {...register("cost_price", { min: 0 })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                                    <Input
                                        id="stock_quantity"
                                        type="number"
                                        {...register("stock_quantity", { required: "Stock quantity is required", min: 0 })}
                                        placeholder="0"
                                    />
                                    {errors.stock_quantity && (
                                        <span className="text-xs text-destructive">{errors.stock_quantity.message}</span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="unit">Unit</Label>
                                    <Input
                                        id="unit"
                                        {...register("unit")}
                                        placeholder="pc, kg, ltr, etc."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t mt-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base text-primary flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            List on Online Store
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Make this product visible on your public storefront</p>
                                    </div>
                                    <Controller
                                        name="is_listed_online"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                                
                                {watch("is_listed_online") && (
                                    <>
                                        <div className="space-y-2">
                                            <Controller
                                                name="image_url"
                                                control={control}
                                                render={({ field }) => (
                                                    <ProductImageUpload
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                        inputId="add_product_image"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Label htmlFor="add_online_description">Product Description</Label>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleGenerateProductCopy}
                                                    disabled={isGeneratingProductCopy}
                                                    className="h-8 gap-1.5"
                                                >
                                                    {isGeneratingProductCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    Generate
                                                </Button>
                                            </div>
                                            <Textarea
                                                id="add_online_description"
                                                {...register("online_description")}
                                                placeholder="Describe the product for online customers..."
                                                rows={5}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => {
                                    setIsAddDialogOpen(false);
                                    reset();
                                }}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={addProductMutation.isPending}>
                                    Add Product
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Product Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Product</DialogTitle>
                            <DialogDescription>
                                Update product information
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_name">Product Name *</Label>
                                <Input
                                    id="edit_name"
                                    {...register("name", { required: "Product name is required" })}
                                    placeholder="Enter product name"
                                />
                                {errors.name && (
                                    <span className="text-xs text-destructive">{errors.name.message}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_price">Selling Price *</Label>
                                    <Input
                                        id="edit_price"
                                        type="number"
                                        step="0.01"
                                        {...register("price", { required: "Price is required", min: 0 })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit_cost_price">Cost Price</Label>
                                    <Input
                                        id="edit_cost_price"
                                        type="number"
                                        step="0.01"
                                        {...register("cost_price", { min: 0 })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_stock_quantity">Stock Quantity *</Label>
                                    <Input
                                        id="edit_stock_quantity"
                                        type="number"
                                        {...register("stock_quantity", { required: "Stock quantity is required", min: 0 })}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit_unit">Unit</Label>
                                    <Input
                                        id="edit_unit"
                                        {...register("unit")}
                                        placeholder="pc, kg, ltr, etc."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t mt-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base text-primary flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            List on Online Store
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Make this product visible on your public storefront</p>
                                    </div>
                                    <Controller
                                        name="is_listed_online"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                                
                                {watch("is_listed_online") && (
                                    <>
                                        <div className="space-y-2">
                                            <Controller
                                                name="image_url"
                                                control={control}
                                                render={({ field }) => (
                                                    <ProductImageUpload
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                        inputId="edit_product_image"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Label htmlFor="edit_online_description">Product Description</Label>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleGenerateProductCopy}
                                                    disabled={isGeneratingProductCopy}
                                                    className="h-8 gap-1.5"
                                                >
                                                    {isGeneratingProductCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    Generate
                                                </Button>
                                            </div>
                                            <Textarea
                                                id="edit_online_description"
                                                {...register("online_description")}
                                                placeholder="Describe the product for online customers..."
                                                rows={5}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => {
                                    setIsEditDialogOpen(false);
                                    setSelectedProduct(null);
                                    reset();
                                }}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateProductMutation.isPending}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete "{selectedProduct?.name}" from your inventory.
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {
                                setIsDeleteDialogOpen(false);
                                setSelectedProduct(null);
                            }}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => selectedProduct && deleteProductMutation.mutate(selectedProduct.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Excel Import Dialog */}
                <ExcelImportDialog
                    open={isImportDialogOpen}
                    onClose={() => setIsImportDialogOpen(false)}
                    userId={userId}
                    existingProducts={products}
                />
            </div>
        </AppLayout>
    );
}
