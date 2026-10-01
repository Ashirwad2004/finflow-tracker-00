import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const LentMoney = lazy(() => import("./pages/LentMoney"));
const BorrowedMoney = lazy(() => import("./pages/BorrowedMoney"));

export const loansRoutes: RouteObject[] = [
  {
    path: "/lent-money",
    element: <LentMoney />,
  },
  {
    path: "/borrowed-money",
    element: <BorrowedMoney />,
  },
];

export { LentMoney, BorrowedMoney };
