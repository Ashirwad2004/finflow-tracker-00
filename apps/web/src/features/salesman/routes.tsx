import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const SalesmanDashboard = lazy(() => import("./pages/SalesmanDashboard"));

export const salesmanRoutes: RouteObject[] = [
  {
    path: "/salesman-dashboard",
    element: <SalesmanDashboard />,
  },
];

export { SalesmanDashboard };
