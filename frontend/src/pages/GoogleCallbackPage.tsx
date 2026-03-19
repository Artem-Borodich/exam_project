import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function getQueryParam(key: string) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key);
}

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const loadMe = useAuthStore((s) => s.loadMe);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getQueryParam("token");
    if (!token) {
      setError("No token in callback URL");
      return;
    }

    setToken(token);
    loadMe()
      .then(() => navigate("/zones"))
      .catch(() => {
        setError("Token accepted, but /auth/me failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1>Google OAuth</h1>
      {error ? <div style={{ color: "crimson" }}>{error}</div> : <div>Signing in...</div>}
    </div>
  );
}

