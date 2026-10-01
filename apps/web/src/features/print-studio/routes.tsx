import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const PrintStudioPage = lazy(() => import("./pages/PrintStudioPage"));

export const printStudioRoutes: RouteObject[] = [
  {
    path: "/print-studio",
    element: <PrintStudioPage />,
  },
];

export { PrintStudioPage };
