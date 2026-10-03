import { Product, ProductFormValues } from "../../types";

export interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  product?: Product | null;
  existingProducts: Product[];
  onSubmit: (data: ProductFormValues) => void;
  isPending: boolean;
  showRackLocations?: boolean;
  enableHsnCode?: boolean;
}

export const DEFAULT_FORM_VALUES: ProductFormValues = {
  name: "",
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  unit: "pc",
  hsn_code: "",
  barcode: "",
  barcode_type: "code128",
  barcode_source: "manufacturer",
  sku: "",
  category: "",
  mrp: 0,
  tax_rate: 0,
  is_listed_online: true,
  online_description: "",
  image_url: "",
  rack_location: "",
};
