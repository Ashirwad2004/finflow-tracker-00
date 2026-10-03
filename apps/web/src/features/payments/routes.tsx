import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const PaymentSuccessPage = lazy(() => import("@/pages/public/PaymentSuccess"));
const PaymentFailurePage = lazy(() => import("@/pages/public/PaymentFailure"));

export const paymentsRoutes: RouteObject[] = [
  {
    path: "/store/:storeSlug/payment-success",
    element: <PaymentSuccessPage />,
  },
  {
    path: "/store/:storeSlug/payment-failure",
    element: <PaymentFailurePage />,
  },
];

export { PaymentSuccessPage, PaymentFailurePage };
