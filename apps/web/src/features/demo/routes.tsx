import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const AdminDashboard = lazy(() => import("./AdminDashboard"));

export const demoRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: <AdminDashboard />,
  },
];

export { AdminDashboard };
