import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const RecentlyDeletedPage = lazy(() => import("./pages/RecentlyDeletedPage"));

export const trashRoutes: RouteObject[] = [
  {
    path: "/recently-deleted",
    element: <RecentlyDeletedPage />,
  },
];

export { RecentlyDeletedPage };
