import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";
import { MerchantRoute } from "@/app/guards";

const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const PersonalReportsPage = lazy(() => import("./pages/PersonalReports"));

export const reportsRoutes: RouteObject[] = [
  {
    path: "/reports",
    element: (
      <MerchantRoute>
        <ReportsPage />
      </MerchantRoute>
    ),
  },
  {
    path: "/personal-reports",
    element: (
      <MerchantRoute>
        <PersonalReportsPage />
      </MerchantRoute>
    ),
  },
];

export default reportsRoutes;
