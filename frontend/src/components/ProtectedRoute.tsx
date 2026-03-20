import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import type { RoleName } from "../store/authStore";
import type { ReactElement } from "react";

type Props = {
  children: ReactElement;
  allowedRoles?: RoleName[];
};

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user?.roleName ?? null;
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

