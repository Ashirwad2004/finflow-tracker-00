import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { MerchantRoute } from "@/app/guards";

const PurchasesPage = lazy(() => import("./pages/PurchasesPage"));

export const purchasesRoutes: RouteObject[] = [
  {
    path: "/purchases",
    element: (
      <MerchantRoute>
        <PurchasesPage />
      </MerchantRoute>
    ),
  },
];

export default purchasesRoutes;
