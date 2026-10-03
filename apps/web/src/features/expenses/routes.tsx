import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const AllExpenses = lazy(() => import("./pages/AllExpenses"));

export const expensesRoutes: RouteObject[] = [
  {
    path: "/expenses",
    element: <AllExpenses />,
  },
];

export { AllExpenses };
