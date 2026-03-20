import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

type Zone = { id: number; name: string };
type Duty = {
  id: number;
  zone: { id: number; name: string };
  employee: { id: number; email: string };
  date: string;
  startTime: string;
  endTime: string;
};

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toTimeInputValue(d: Date) {
  return d.toISOString().slice(11, 16);
}

export function ShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const roleName = user?.roleName ?? null;

  const [zones, setZones] = useState<Zone[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);

  const [zoneId, setZoneId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [date, setDate] = useState<string>(() => toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState<string>(() => toTimeInputValue(new Date()));
  const [endTime, setEndTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 8);
    return toTimeInputValue(d);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadZones() {
    const { data } = await api.get<Zone[]>("/zones");
    setZones(data.map((z) => ({ id: z.id, name: z.name })));
    if (data.length > 0) setZoneId((prev) => prev ?? data[0].id);
  }

  async function loadDuties() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Duty[]>("/duties");
      setDuties(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load duties");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadZones().catch(() => {});
    loadDuties().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreate = useMemo(() => roleName === "MANAGER", [roleName]);

  async function createDuty() {
    if (!zoneId) {
      setError("Choose zone");
      return;
    }
    if (!employeeId) {
      setError("Choose employeeId");
      return;
    }
    if (!date || !startTime || !endTime) {
      setError("Provide date/time");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post("/duties", {
        zoneId,
        employeeId,
        date,
        startTime,
        endTime,
        timezone: "UTC",
      });
      await loadDuties();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Create duty failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h1>Duties</h1>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {roleName ? <div style={{ paddingTop: 10 }}>Role: {roleName}</div> : null}
      </div>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Create duty {canCreate ? "(manager)" : "(read-only)"}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Zone</label>
            <select
              value={zoneId ?? ""}
              onChange={(e) => setZoneId(Number(e.target.value))}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              disabled={!canCreate}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Employee ID</label>
            <input
              type="number"
              value={employeeId || ""}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              disabled={!canCreate}
              min={1}
            />
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              Only approved employees (role=employee) can be assigned.
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              disabled={!canCreate}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Time</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#666" }}>Start</div>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                  disabled={!canCreate}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#666" }}>End</div>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                  disabled={!canCreate}
                />
              </div>
            </div>
          </div>

          <button
            onClick={createDuty}
            disabled={!canCreate || loading}
            style={{ width: "100%", padding: "10px 14px" }}
          >
            {loading ? "Creating..." : "Create duty"}
          </button>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Upcoming duties</div>
          {loading ? <div>Loading...</div> : null}
          <div style={{ display: "grid", gap: 12 }}>
            {duties.map((s) => (
              <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>
                  {s.zone.name} - {s.employee.email}
                </div>
                <div style={{ color: "#555", fontSize: 13 }}>
                  {new Date(s.date).toISOString().slice(0, 10)} {s.startTime} .. {s.endTime}
                </div>
              </div>
            ))}
          </div>
          {duties.length === 0 && !loading ? <div>No duties yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

