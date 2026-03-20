import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Duty = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  zone: { id: number; name: string };
  employee: { id: number; email: string };
};

type DutyResult = {
  id: number;
  dutyId: number;
  trafficLightId: number;
  startTime: string;
  greenWithCars: number;
  greenWithoutCars: number;
  redWithCars: number;
  redWithoutCars: number;
};

function toLocalDatetimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function DutyResultsPage() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [selectedDutyId, setSelectedDutyId] = useState<number | null>(null);

  const [trafficLightId, setTrafficLightId] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>(() =>
    toLocalDatetimeInputValue(new Date())
  );
  const [greenWithCars, setGreenWithCars] = useState<number>(0);
  const [greenWithoutCars, setGreenWithoutCars] = useState<number>(0);
  const [redWithCars, setRedWithCars] = useState<number>(0);
  const [redWithoutCars, setRedWithoutCars] = useState<number>(0);

  const [results, setResults] = useState<DutyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDuty = useMemo(
    () => duties.find((d) => d.id === selectedDutyId) ?? null,
    [duties, selectedDutyId]
  );

  useEffect(() => {
    setError(null);
    api
      .get<Duty[]>("/duties")
      .then(({ data }) => {
        setDuties(data);
        if (data.length > 0) setSelectedDutyId((prev) => prev ?? data[0].id);
      })
      .catch((e: any) => setError(e?.response?.data?.message ?? e?.message ?? "Failed to load duties"));
  }, []);

  useEffect(() => {
    if (!selectedDutyId) return;
    api
      .get<DutyResult[]>(`/duty-results/duty/${selectedDutyId}`)
      .then(({ data }) => setResults(data))
      .catch(() => setResults([]));
  }, [selectedDutyId]);

  async function submitOne() {
    if (!selectedDutyId) return;
    setLoading(true);
    setError(null);
    try {
      const iso = new Date(startTime).toISOString();
      await api.post("/duty-results/bulk", {
        dutyId: selectedDutyId,
        records: [
          {
            trafficLightId,
            startTime: iso,
            greenWithCars,
            greenWithoutCars,
            redWithCars,
            redWithoutCars,
          },
        ],
      });

      // refresh current results
      const { data } = await api.get<DutyResult[]>(`/duty-results/duty/${selectedDutyId}`);
      setResults(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h1>Duty Results Entry</h1>
      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Submit 5-minute interval</div>

          <div style={{ marginBottom: 12 }}>
            <label>Duty</label>
            <select
              value={selectedDutyId ?? ""}
              onChange={(e) => setSelectedDutyId(Number(e.target.value))}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            >
              {duties.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.zone.name} ({d.date} {d.startTime}-{d.endTime})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>trafficLightId</label>
            <input
              type="number"
              value={trafficLightId}
              onChange={(e) => setTrafficLightId(Number(e.target.value))}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              min={1}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>startTime (ISO/UTC)</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <div>
              <label>greenWithCars</label>
              <input
                type="number"
                value={greenWithCars}
                onChange={(e) => setGreenWithCars(Number(e.target.value))}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                min={0}
              />
            </div>
            <div>
              <label>greenWithoutCars</label>
              <input
                type="number"
                value={greenWithoutCars}
                onChange={(e) => setGreenWithoutCars(Number(e.target.value))}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                min={0}
              />
            </div>
            <div>
              <label>redWithCars</label>
              <input
                type="number"
                value={redWithCars}
                onChange={(e) => setRedWithCars(Number(e.target.value))}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                min={0}
              />
            </div>
            <div>
              <label>redWithoutCars</label>
              <input
                type="number"
                value={redWithoutCars}
                onChange={(e) => setRedWithoutCars(Number(e.target.value))}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                min={0}
              />
            </div>
          </div>

          <button
            disabled={!selectedDutyId || loading}
            onClick={submitOne}
            style={{ width: "100%", padding: "10px 14px" }}
          >
            {loading ? "Saving..." : "Save interval"}
          </button>

          {selectedDuty ? (
            <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
              Duty: {selectedDuty.zone.name} on {selectedDuty.date}. Valid interval: {selectedDuty.startTime}..{selectedDuty.endTime}.
            </div>
          ) : null}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Existing results</div>
          {results.length === 0 ? (
            <div style={{ color: "#666" }}>No duty results yet for this duty.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {results.map((r) => (
                <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>
                    {r.startTime} (TL {r.trafficLightId})
                  </div>
                  <div style={{ fontSize: 13, color: "#444" }}>
                    greenWithCars={r.greenWithCars}, greenWithoutCars={r.greenWithoutCars}, redWithCars={r.redWithCars}, redWithoutCars={r.redWithoutCars}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

