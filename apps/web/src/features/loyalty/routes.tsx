import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const LoyaltyCampaignsPage = lazy(() => import("./pages/LoyaltyCampaignsPage"));

export const loyaltyRoutes: RouteObject[] = [
  {
    path: "/loyalty",
    element: <LoyaltyCampaignsPage />,
  },
];

export { LoyaltyCampaignsPage };
