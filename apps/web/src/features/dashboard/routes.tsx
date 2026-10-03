import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Dashboard = lazy(() => import("./Dashboard"));
const BusinessDashboard = lazy(() => import("./BusinessDashboard"));

export const dashboardRoutes: RouteObject[] = [
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/business-dashboard",
    element: <BusinessDashboard />,
  },
];

export { Dashboard, BusinessDashboard };
