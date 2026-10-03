import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Settings = lazy(() => import("./pages/Settings"));

export const settingsRoutes: RouteObject[] = [
  {
    path: "/settings",
    element: <Settings />,
  },
];

export { Settings };
