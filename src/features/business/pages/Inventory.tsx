import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
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
import { Plus, Pencil, Trash2, Search, Package, AlertCircle, Settings2, Info, Globe } from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
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
import { ProductImageUpload } from "@/features/business/components/ProductImageUpload";

interface Product {
    id: string;
    user_id: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    created_at: string;
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

export default function Inventory() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const { settings, updateSetting, resetSettings } = useItemSettings(user?.id);

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const { register, handleSubmit, formState: { errors }, reset, watch, control } = useForm<ProductFormValues>({
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

    // Fetch products
    const { data: products = [], isLoading } = useQuery({
        queryKey: ["products", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products" as any)
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as unknown) as Product[];
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
            const { error } = await supabase.from("products" as any).insert({
                user_id: user?.id,
                ...values
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
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
            if (!selectedProduct) return;
            const { error } = await supabase
                .from("products" as any)
                .update(values)
                .eq("id", selectedProduct.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
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

            const { error } = await supabase
                .from("products" as any)
                .delete()
                .eq("id", productId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
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
        addProductMutation.mutate(data);
    };

    const onEditSubmit = (data: ProductFormValues) => {
        updateProductMutation.mutate(data);
    };

    const lowStockThreshold = settings.lowStockWarningThreshold;
    const lowStockCount = lowStockThreshold > 0
        ? products.filter(p => p.stock_quantity < lowStockThreshold).length
        : 0;

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Package className="w-8 h-8" />
                            Inventory Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your products and stock levels
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="gap-2">
                            <Settings2 className="w-4 h-4" />
                            Item Settings
                        </Button>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
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
                <div className="border rounded-lg overflow-hidden bg-card">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
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
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(product)}
                                                className="text-destructive"
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
                    <DialogContent className="sm:max-w-[520px]">
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
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={settings.stopSaleOnNegativeStock}
                                    onClick={() => updateSetting("stopSaleOnNegativeStock", !settings.stopSaleOnNegativeStock)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.stopSaleOnNegativeStock
                                            ? "border-red-500 bg-red-500"
                                            : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                        settings.stopSaleOnNegativeStock ? "translate-x-5" : "translate-x-0.5"
                                    }`} />
                                </button>
                            </div>

                            {/* Low Stock Threshold */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-3">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Low Stock Warning Threshold</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Show a low stock badge when quantity falls below this number. Set to 0 to disable.
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    max={9999}
                                    value={settings.lowStockWarningThreshold}
                                    onChange={(e) => updateSetting("lowStockWarningThreshold", Math.max(0, Number(e.target.value)))}
                                    className="w-20 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
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
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={settings.deductStockOnlyOnPaid}
                                    onClick={() => updateSetting("deductStockOnlyOnPaid", !settings.deductStockOnlyOnPaid)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.deductStockOnlyOnPaid
                                            ? "border-primary bg-primary"
                                            : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                        settings.deductStockOnlyOnPaid ? "translate-x-5" : "translate-x-0.5"
                                    }`} />
                                </button>
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
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={settings.showStockInItemPicker}
                                    onClick={() => updateSetting("showStockInItemPicker", !settings.showStockInItemPicker)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.showStockInItemPicker
                                            ? "border-primary bg-primary"
                                            : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                        settings.showStockInItemPicker ? "translate-x-5" : "translate-x-0.5"
                                    }`} />
                                </button>
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
                    <DialogContent className="sm:max-w-[500px]">
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
                                            <Label htmlFor="add_online_description">Product Description</Label>
                                            <Textarea
                                                id="add_online_description"
                                                {...register("online_description")}
                                                placeholder="Describe the product for online customers..."
                                                rows={3}
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
                    <DialogContent className="sm:max-w-[500px]">
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
                                            <Label htmlFor="edit_online_description">Product Description</Label>
                                            <Textarea
                                                id="edit_online_description"
                                                {...register("online_description")}
                                                placeholder="Describe the product for online customers..."
                                                rows={3}
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
            </div>
        </AppLayout>
    );
}
