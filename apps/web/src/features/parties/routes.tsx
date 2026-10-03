import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { MerchantRoute } from "@/app/guards";

const PartiesPage = lazy(() => import("./pages/PartiesPage"));

export const partiesRoutes: RouteObject[] = [
  {
    path: "/parties",
    element: (
      <MerchantRoute>
        <PartiesPage />
      </MerchantRoute>
    ),
  },
];

export default partiesRoutes;
