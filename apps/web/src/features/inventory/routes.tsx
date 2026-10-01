import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { MerchantRoute } from "@/app/guards";

const InventoryPage = lazy(() => import("./pages/InventoryPage"));

export const inventoryRoutes: RouteObject[] = [
  {
    path: "/inventory",
    element: (
      <MerchantRoute>
        <InventoryPage />
      </MerchantRoute>
    ),
  },
];

export default inventoryRoutes;
