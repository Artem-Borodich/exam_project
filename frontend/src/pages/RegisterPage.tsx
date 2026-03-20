import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await register({
        email: form.email,
        name: form.name || undefined,
        password: form.password,
      });
      setSuccess("User created. Wait for manager confirmation.");
      setTimeout(() => navigate("/login"), 800);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1>Register</h1>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            style={{ width: "100%", padding: 8 }}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            style={{ width: "100%", padding: 8 }}
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
        {success ? <div style={{ color: "green", marginBottom: 12 }}>{success}</div> : null}

        <button disabled={loading} type="submit" style={{ padding: "10px 16px" }}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </div>
  );
}

