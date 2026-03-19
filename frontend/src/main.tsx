import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

import { ProtectedRoute } from "./components/ProtectedRoute";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { GoogleCallbackPage } from "./pages/GoogleCallbackPage";
import { ZonesPage } from "./pages/ZonesPage";
import { ShiftsPage } from "./pages/ShiftsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ManagerConfirmPage } from "./pages/ManagerConfirmPage";

function HomeRedirect() {
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? "/zones" : "/login"} replace />;
}

function Bootstrap() {
  const token = useAuthStore((s) => s.token);
  const loadMe = useAuthStore((s) => s.loadMe);

  useEffect(() => {
    if (token) {
      loadMe().catch(() => {
        // token может быть устаревшим - просто очистим состояние
      });
    }
  }, [token, loadMe]);

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/google-callback" element={<GoogleCallbackPage />} />

      <Route
        path="/zones"
        element={
          <ProtectedRoute allowedRoles={["USER", "EMPLOYEE", "MANAGER"]}>
            <ZonesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shifts"
        element={
          <ProtectedRoute allowedRoles={["USER", "EMPLOYEE", "MANAGER"]}>
            <ShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/pending"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerConfirmPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Bootstrap />
  </BrowserRouter>
);

