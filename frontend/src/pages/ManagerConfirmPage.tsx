import { useEffect, useState } from "react";
import { api } from "../services/api";

type PendingUser = {
  id: number;
  email: string | null;
  name: string | null;
  createdAt: string;
};

export function ManagerConfirmPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PendingUser[]>("/roles/pending");
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm(userId: number) {
    setError(null);
    try {
      await api.post("/roles/confirm", { userId });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Confirm failed");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h1>Manager: pending confirmations</h1>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      {loading ? <div>Loading...</div> : null}

      {!loading && users.length === 0 ? <div>No pending users.</div> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {users.map((u) => (
          <div
            key={u.id}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
          >
            <div style={{ fontWeight: 600 }}>{u.email}</div>
            <div style={{ color: "#555" }}>
              {u.name ? `Name: ${u.name}` : ""}
            </div>
            <button
              onClick={() => confirm(u.id)}
              style={{ marginTop: 10, padding: "8px 12px" }}
            >
              Confirm as employee
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

