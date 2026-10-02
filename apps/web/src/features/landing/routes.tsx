import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const LandingPage = lazy(() => import("@/pages/public/LandingPage"));
const PricingPage = lazy(() => import("@/pages/public/Pricing"));
const PrivacyPolicy = lazy(() => import("@/pages/public/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/public/TermsOfService"));
const NotFound = lazy(() => import("@/pages/public/NotFound"));

export const landingRoutes: RouteObject[] = [
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/pricing",
    element: <PricingPage />,
  },
  {
    path: "/payment",
    element: <PricingPage />,
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/terms",
    element: <TermsOfService />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export { LandingPage, PricingPage, PrivacyPolicy, TermsOfService, NotFound };
