import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Printer,
  RotateCw,
  Copy,
  Package,
} from "lucide-react";
import { POSProduct } from "../../types";

interface BarcodeProductTableProps {
  products: POSProduct[];
  isLoading: boolean;
  selectedProductIds: Set<string>;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onGenerateBarcode: (product: POSProduct) => void;
  isGeneratingSingle: string | null;
  onOpenPrintForSingle: (product: POSProduct) => void;
  onOpenRegenerate: (product: POSProduct) => void;
  onCopyToClipboard: (text: string) => void;
}

export const BarcodeProductTable: React.FC<BarcodeProductTableProps> = ({
  products,
  isLoading,
  selectedProductIds,
  onSelectAll,
  onToggleSelect,
  onGenerateBarcode,
  isGeneratingSingle,
  onOpenPrintForSingle,
  onOpenRegenerate,
  onCopyToClipboard,
}) => {
  return (
    <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40 border-b border-border/80">
          <TableRow className="hover:bg-transparent border-border/80">
            <TableHead className="w-12 text-center">
              <Checkbox
                checked={
                  products.length > 0 &&
                  selectedProductIds.size === products.length
                }
                onCheckedChange={onSelectAll}
                aria-label="Select all"
                className="border-border data-[state=checked]:bg-primary"
              />
            </TableHead>
            <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider">
              Product Name & Category
            </TableHead>
            <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider">
              Barcode & Format
            </TableHead>
            <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider">
              SKU
            </TableHead>
            <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider text-right">
              Price / MRP
            </TableHead>
            <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider text-center">
              Stock
            </TableHead>
            <TableHead className="text-foreground font-bold text-xs uppercase tracking-wider text-right pr-6">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/60">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                Loading barcode directory...
              </TableCell>
            </TableRow>
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="font-semibold text-foreground">
                  No products match your search or filter criteria.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try resetting the search keyword or filter options.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const hasBarcode = Boolean(product.barcode && product.barcode.trim());
              const isSelected = selectedProductIds.has(product.id);

              return (
                <TableRow
                  key={product.id}
                  className={`hover:bg-muted/40 border-border/60 transition-colors ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(product.id)}
                      aria-label={`Select ${product.name}`}
                      className="border-border data-[state=checked]:bg-primary"
                    />
                  </TableCell>

                  <TableCell>
                    <div className="font-semibold text-foreground text-sm leading-tight">
                      {product.name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      {product.category && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-border bg-muted/50 text-muted-foreground font-medium"
                        >
                          {product.category}
                        </Badge>
                      )}
                      {product.hsn_code && <span>HSN: {product.hsn_code}</span>}
                    </div>
                  </TableCell>

                  <TableCell>
                    {hasBarcode ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                          {product.barcode}
                        </span>
                        <button
                          onClick={() => onCopyToClipboard(product.barcode!)}
                          title="Copy Barcode"
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <Badge
                          variant="outline"
                          className="text-[9px] border-border text-muted-foreground uppercase font-mono"
                        >
                          {product.barcode_type || "CODE128"}
                        </Badge>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium"
                      >
                        Missing Barcode
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.sku || "—"}
                  </TableCell>

                  <TableCell className="text-right font-mono">
                    <div className="text-foreground font-bold text-sm">
                      ₹{product.price.toFixed(2)}
                    </div>
                    {product.mrp && product.mrp > product.price && (
                      <div className="text-[10px] text-muted-foreground line-through">
                        MRP: ₹{product.mrp.toFixed(2)}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-center font-mono">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${
                        product.stock_quantity > 5
                          ? "border-border text-foreground bg-muted/40"
                          : product.stock_quantity > 0
                          ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                          : "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                      }`}
                    >
                      {product.stock_quantity} {product.unit || "pc"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      {!hasBarcode ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isGeneratingSingle === product.id}
                          onClick={() => onGenerateBarcode(product)}
                          className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          {isGeneratingSingle === product.id
                            ? "Generating..."
                            : "Generate"}
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenPrintForSingle(product)}
                            className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1.5 text-primary" />
                            Print Label
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenRegenerate(product)}
                            title="Regenerate Barcode"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
