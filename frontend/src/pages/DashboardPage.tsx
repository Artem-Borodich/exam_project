import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const roleName = user?.roleName ?? null;

  const links = useMemo(() => {
    if (roleName === "MANAGER") {
      return [
        { to: "/manager/pending", label: "Pending approvals" },
        { to: "/zones", label: "Zones (polygon)" },
        { to: "/duties", label: "Duty scheduling" },
        { to: "/reports", label: "Reports (by day)" },
      ];
    }
    if (roleName === "EMPLOYEE") {
      return [
        { to: "/duties", label: "My duties" },
        { to: "/duty-results", label: "Enter duty results" },
      ];
    }
    return [{ to: "/login", label: "Login" }];
  }, [roleName]);

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h1>Dashboard</h1>
      {user ? (
        <div style={{ color: "#666", marginBottom: 14 }}>
          {user.email} • role={roleName ?? "null"} • approved={String(user.isApproved)}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              textDecoration: "none",
              color: "#111",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

