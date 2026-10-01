import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { MerchantRoute } from "@/app/guards";

const SalesPage = lazy(() => import("./pages/SalesPage"));

export const salesRoutes: RouteObject[] = [
  {
    path: "/sales",
    element: (
      <MerchantRoute>
        <SalesPage />
      </MerchantRoute>
    ),
  },
];

export default salesRoutes;
