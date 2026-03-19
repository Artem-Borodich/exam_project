import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

type Zone = { id: number; name: string };
type Shift = {
  id: number;
  startAt: string;
  endAt: string;
  zone: { id: number; name: string };
  employee: { id: number; username: string };
  googleEventId: string | null;
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
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [zoneId, setZoneId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [date, setDate] = useState<string>(() => toDateInputValue(new Date()));
  const [time, setTime] = useState<string>(() => toTimeInputValue(new Date()));
  const [durationMinutes, setDurationMinutes] = useState<number>(480);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadZones() {
    const { data } = await api.get<Zone[]>("/zones");
    setZones(data.map((z) => ({ id: z.id, name: z.name })));
    if (data.length > 0) setZoneId((prev) => prev ?? data[0].id);
  }

  async function loadShifts() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Shift[]>("/shifts");
      setShifts(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadZones().catch(() => {});
    loadShifts().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreate = useMemo(() => roleName === "MANAGER", [roleName]);

  async function connectGoogle() {
    const { data } = await api.get<{ url: string }>("/auth/google/start");
    window.location.href = data.url;
  }

  async function createShift() {
    if (!zoneId) {
      setError("Choose zone");
      return;
    }
    if (!employeeId) {
      setError("Choose employeeId");
      return;
    }
    if (!date || !time) {
      setError("Provide date/time");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post("/shifts", {
        zoneId,
        employeeId,
        date,
        time,
        durationMinutes,
        timezone: "UTC",
      });
      await loadShifts();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Create shift failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h1>Shifts</h1>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={connectGoogle} style={{ padding: "10px 14px" }}>
          Connect Google (OAuth)
        </button>
        {roleName ? <div style={{ paddingTop: 10 }}>Role: {roleName}</div> : null}
      </div>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Create shift {canCreate ? "(manager)" : "(read-only)"}
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
              Employee must have connected Google to create calendar events.
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
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              disabled={!canCreate}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Duration (minutes)</label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              disabled={!canCreate}
              min={30}
            />
          </div>

          <button
            onClick={createShift}
            disabled={!canCreate || loading}
            style={{ width: "100%", padding: "10px 14px" }}
          >
            {loading ? "Creating..." : "Create shift + Calendar event"}
          </button>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Upcoming shifts</div>
          {loading ? <div>Loading...</div> : null}
          <div style={{ display: "grid", gap: 12 }}>
            {shifts.map((s) => (
              <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>
                  {s.zone.name} - {s.employee.username}
                </div>
                <div style={{ color: "#555", fontSize: 13 }}>
                  {new Date(s.startAt).toLocaleString()} .. {new Date(s.endAt).toLocaleString()}
                </div>
                {s.googleEventId ? (
                  <div style={{ fontSize: 12, marginTop: 6, color: "#2b7a0b" }}>
                    Google event id: {s.googleEventId}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, marginTop: 6, color: "#999" }}>
                    No Google calendar event id
                  </div>
                )}
              </div>
            ))}
          </div>
          {shifts.length === 0 && !loading ? <div>No shifts yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

