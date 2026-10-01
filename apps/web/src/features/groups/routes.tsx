import React, { lazy } from "react";
import { RouteObject } from "react-router-dom";

const Groups = lazy(() => import("./Groups"));
const GroupDetail = lazy(() => import("./GroupDetail"));
const JoinGroup = lazy(() => import("./JoinGroup"));

export const groupsRoutes: RouteObject[] = [
  {
    path: "/groups",
    element: <Groups />,
  },
  {
    path: "/groups/:groupId",
    element: <GroupDetail />,
  },
  {
    path: "/join/:inviteCode",
    element: <JoinGroup />,
  },
];

export { Groups, GroupDetail, JoinGroup };
