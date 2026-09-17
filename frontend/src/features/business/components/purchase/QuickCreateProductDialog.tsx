import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus } from "lucide-react";
import { ProductItem } from "./ProductCombobox";
import { v4 as uuidv4 } from "uuid";

interface QuickCreateProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    onSaveProduct: (product: ProductItem) => void;
}

const COMMON_UNITS = ["pc", "box", "kg", "g", "ltr", "ml", "bag", "bundle", "meter", "pair", "set"];

export const QuickCreateProductDialog = ({
    open,
    onOpenChange,
    initialName = "",
    onSaveProduct,
}: QuickCreateProductDialogProps) => {
    const [name, setName] = useState(initialName);
    const [costPrice, setCostPrice] = useState<number | "">("");
    const [sellingPrice, setSellingPrice] = useState<number | "">("");
    const [unit, setUnit] = useState("pc");
    const [hsnCode, setHsnCode] = useState("");
    const [stockQuantity, setStockQuantity] = useState<number | "">("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setName(initialName);
            setCostPrice("");
            setSellingPrice("");
            setUnit("pc");
            setHsnCode("");
            setStockQuantity("");
        }
    }, [open, initialName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSaving(true);
        const cost = Number(costPrice) || 0;
        const sell = Number(sellingPrice) || cost;
        const stock = Number(stockQuantity) || 0;

        const newProd: ProductItem = {
            id: uuidv4(),
            name: name.trim(),
            cost_price: cost,
            price: sell,
            stock_quantity: stock,
            unit: unit.trim() || "pc",
            hsn_code: hsnCode.trim() || undefined,
        };

        onSaveProduct(newProd);
        setIsSaving(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-background border-border/80 shadow-2xl rounded-2xl">
                <DialogHeader className="px-5 py-4 border-b border-border/60 bg-muted/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Package className="w-4 h-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Quick Add Product to Inventory
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground">
                                Add product to catalog & immediately auto-fill purchase bill
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Product Name */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                            Product / Item Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Ultratech Cement 50kg or Steel Wire"
                            className="h-9 text-xs bg-background"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Cost Rate & Selling Rate */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Purchase Cost (₹)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={costPrice}
                                onChange={(e) =>
                                    setCostPrice(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                placeholder="0.00"
                                className="h-9 text-xs bg-background"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Selling Price (₹)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={sellingPrice}
                                onChange={(e) =>
                                    setSellingPrice(e.target.value === "" ? "" : Number(e.target.value))
                                }
                                placeholder="0.00"
                                className="h-9 text-xs bg-background"
                            />
                        </div>
                    </div>

                    {/* Unit & HSN Code */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Primary Unit
                            </Label>
                            <div className="relative">
                                <Input
                                    list="quick-product-units"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="pc, kg, box"
                                    className="h-9 text-xs bg-background"
                                />
                                <datalist id="quick-product-units">
                                    {COMMON_UNITS.map((u) => (
                                        <option key={u} value={u} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                HSN / SAC Code
                            </Label>
                            <Input
                                type="text"
                                value={hsnCode}
                                onChange={(e) => setHsnCode(e.target.value)}
                                placeholder="e.g. 2523"
                                className="h-9 text-xs font-mono uppercase bg-background"
                            />
                        </div>
                    </div>

                    {/* Opening Stock */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                            Opening Stock (Optional)
                        </Label>
                        <Input
                            type="number"
                            min="0"
                            step="1"
                            value={stockQuantity}
                            onChange={(e) =>
                                setStockQuantity(e.target.value === "" ? "" : Number(e.target.value))
                            }
                            placeholder="Current available inventory (e.g. 0)"
                            className="h-9 text-xs bg-background"
                        />
                    </div>

                    <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-8 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!name.trim() || isSaving}
                            className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Save & Auto-Fill</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};