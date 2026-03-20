import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function connectGoogle() {
    setError(null);
    try {
      const { data } = await api.get<{ url: string }>("/auth/google/start");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Google OAuth failed");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form);
      navigate("/zones");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1>Login</h1>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button type="button" onClick={connectGoogle} style={{ padding: "10px 16px" }}>
          Sign in with Google
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            value={form.login}
            onChange={(e) => setForm((s) => ({ ...s, login: e.target.value }))}
            style={{ width: "100%", padding: 8 }}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            style={{ width: "100%", padding: 8 }}
            required
          />
        </div>

        {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

        <button disabled={loading} type="submit" style={{ padding: "10px 16px" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

