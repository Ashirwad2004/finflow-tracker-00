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
import { TableLoadingRows } from "@/components/shared/PageStates";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Package, Pencil, Trash2, Globe, Barcode, Plus } from "lucide-react";
import { Product } from "../types";

interface InventoryTableProps {
  products: Product[];
  isLoading: boolean;
  searchTerm: string;
  showRackLocations?: boolean;
  enableHsnCode?: boolean;
  lowStockThreshold?: number;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddProduct: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  isLoading,
  searchTerm,
  showRackLocations = false,
  enableHsnCode = false,
  lowStockThreshold = 0,
  onEdit,
  onDelete,
  onAddProduct,
}) => {
  const { formatCurrency } = useCurrency();

  const colsCount =
    5 + (showRackLocations ? 1 : 0) + (enableHsnCode ? 1 : 0) + 1; // name, [rack], [hsn], price, cost, stock, unit, actions

  return (
    <div className="border rounded-lg overflow-x-auto bg-card">
      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              {showRackLocations && <TableHead>Rack Location</TableHead>}
              {enableHsnCode && <TableHead>HSN Code</TableHead>}
              <TableHead>Price</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoadingRows cols={colsCount} rows={5} />
          </TableBody>
        </Table>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "No products match your search."
              : "Add your first product to get started!"}
          </p>
          {!searchTerm && (
            <Button onClick={onAddProduct}>
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
              {showRackLocations && <TableHead>Rack Location</TableHead>}
              {enableHsnCode && <TableHead>HSN Code</TableHead>}
              <TableHead>Price</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{product.name}</span>
                    {product.is_listed_online && (
                      <Globe className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  {product.barcode && (
                    <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Barcode className="w-3 h-3 text-blue-500" />
                      <span>{product.barcode}</span>
                      {product.sku && (
                        <span className="text-slate-400">• SKU: {product.sku}</span>
                      )}
                    </div>
                  )}
                </TableCell>
                {showRackLocations && (
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] max-w-[120px] truncate bg-slate-50 dark:bg-slate-900 border-slate-200"
                    >
                      {product.rack_location || "—"}
                    </Badge>
                  </TableCell>
                )}
                {enableHsnCode && (
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.hsn_code || "—"}
                  </TableCell>
                )}
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>{formatCurrency(product.cost_price ?? 0)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{product.stock_quantity}</span>
                    {product.stock_quantity < lowStockThreshold &&
                      lowStockThreshold > 0 && (
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
                    onClick={() => onEdit(product)}
                    title={`Edit ${product.name}`}
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(product)}
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
  );
};
