import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
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
import { Plus, Pencil, Trash2, Search, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useCurrency } from "@/contexts/CurrencyContext";
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

interface Product {
    id: string;
    user_id: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    created_at: string;
}

interface ProductFormValues {
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
}

export default function Inventory() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<ProductFormValues>({
        defaultValues: {
            name: "",
            price: 0,
            cost_price: 0,
            stock_quantity: 0,
            unit: "pc"
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
            return data as Product[];
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
            unit: product.unit
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

    const lowStockCount = products.filter(p => p.stock_quantity < 10).length;

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
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </Button>
                </div>

                {lowStockCount > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <div>
                            <p className="font-medium text-orange-900 dark:text-orange-100">
                                Low Stock Alert
                            </p>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                                {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} {lowStockCount !== 1 ? 'are' : 'is'} running low on stock (less than 10 units)
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
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{formatCurrency(product.price)}</TableCell>
                                        <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{product.stock_quantity}</span>
                                                {product.stock_quantity < 10 && (
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
