import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const POSPage = lazy(() => import("./pages/POSPage"));
const BarcodeManagementPage = lazy(() => import("./pages/BarcodeManagement"));

export const posRoutes: RouteObject[] = [
  {
    path: "/pos",
    element: <POSPage />,
  },
  {
    path: "/inventory/barcodes",
    element: <BarcodeManagementPage />,
  },
];

export { POSPage, BarcodeManagementPage };
