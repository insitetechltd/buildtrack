import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/state/authStore";
import { canAccessCompanyAdmin } from "@/web/access";

type Props = {
  children: React.ReactElement;
  /** When true, only company admins may enter. */
  companyAdminOnly?: boolean;
};

export function RequireAuth({ children, companyAdminOnly = false }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (companyAdminOnly && !canAccessCompanyAdmin(user)) {
    return <Navigate to="/desk" replace />;
  }
  return children;
}
