import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { MerchantRoute } from "@/app/guards";

const BankDetailsPage = lazy(() => import("./pages/BankDetails"));

export const bankingRoutes: RouteObject[] = [
  {
    path: "/bank-details",
    element: (
      <MerchantRoute>
        <BankDetailsPage />
      </MerchantRoute>
    ),
  },
];

export default bankingRoutes;
