import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Auth = lazy(() => import("./Auth"));
const SalesmanLogin = lazy(() => import("./SalesmanLogin"));

export const authRoutes: RouteObject[] = [
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/salesman-login",
    element: <SalesmanLogin />,
  },
];

export { Auth, SalesmanLogin };
