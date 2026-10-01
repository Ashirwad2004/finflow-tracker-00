import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { MerchantRoute } from "@/app/guards";

const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const BarcodeManagementPage = lazy(() => import("@/features/pos/pages/BarcodeManagement"));

export const inventoryRoutes: RouteObject[] = [
  {
    path: "/inventory",
    element: (
      <MerchantRoute>
        <InventoryPage />
      </MerchantRoute>
    ),
  },
  {
    path: "/inventory/barcodes",
    element: (
      <MerchantRoute>
        <BarcodeManagementPage />
      </MerchantRoute>
    ),
  },
];

export default inventoryRoutes;
