import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const OnlineStorePage = lazy(() => import("./pages/OnlineStorePage"));
const Storefront = lazy(() => import("./Storefront"));

export const storefrontRoutes: RouteObject[] = [
  {
    path: "/online-store",
    element: <OnlineStorePage />,
  },
  {
    path: "/store/:storeSlug",
    element: <Storefront />,
  },
];

export { OnlineStorePage, Storefront };
