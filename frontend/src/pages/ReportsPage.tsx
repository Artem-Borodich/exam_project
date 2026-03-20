import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Zone = { id: number; name: string };

type ReportResponse = {
  zoneId: number;
  zoneName: string;
  fromDate: string;
  toDate: string;
  intervals: Array<{ label: string }>;
  days: Array<{
    day: string; // YYYY-MM-DD
    buckets: Array<{
      greenWithCars: number;
      greenWithoutCarsPlusRedWithoutCars: number;
      redWithCars: number;
    }>;
  }>;
};

export function ReportsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<number | null>(null);

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(() => zoneId != null && fromDate && toDate, [zoneId, fromDate, toDate]);

  useEffect(() => {
    api
      .get<Zone[]>("/zones")
      .then(({ data }) => {
        setZones(data);
        if (data.length > 0) setZoneId((prev) => prev ?? data[0].id);
      })
      .catch(() => {});
  }, []);

  async function generate() {
    if (!zoneId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ReportResponse>("/reports/generate", { zoneId, fromDate, toDate });
      setReport(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Generate report failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <h1>Duty Results Report</h1>
      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Report parameters</div>

          <div style={{ marginBottom: 12 }}>
            <label>Zone</label>
            <select
              value={zoneId ?? ""}
              onChange={(e) => setZoneId(Number(e.target.value))}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </div>

          <button
            onClick={generate}
            disabled={!canGenerate || loading}
            style={{ width: "100%", padding: "10px 14px" }}
          >
            {loading ? "Generating..." : "Generate report"}
          </button>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          {!report ? (
            <div style={{ color: "#666" }}>
              Select parameters and generate report. Columns are aggregated by fixed time buckets and grouped by day.
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                {report.zoneName}: {report.fromDate} .. {report.toDate}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ border: "1px solid #ddd", padding: 8, textAlign: "left" }}>
                      Day
                    </th>
                    {report.intervals.map((i) => (
                      <th key={i.label} colSpan={3} style={{ border: "1px solid #ddd", padding: 8 }}>
                        {i.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {report.intervals.flatMap((i, idx) => [
                      <th
                        key={`${i.label}-${idx}-gwc`}
                        style={{ border: "1px solid #ddd", padding: 6, fontSize: 12 }}
                      >
                        greenWithCars
                      </th>,
                      <th
                        key={`${i.label}-${idx}-gwrwc`}
                        style={{ border: "1px solid #ddd", padding: 6, fontSize: 12 }}
                      >
                        greenWithoutCars+redWithoutCars
                      </th>,
                      <th
                        key={`${i.label}-${idx}-rwc`}
                        style={{ border: "1px solid #ddd", padding: 6, fontSize: 12 }}
                      >
                        redWithCars
                      </th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {report.days.map((d) => (
                    <tr key={d.day}>
                      <td style={{ border: "1px solid #ddd", padding: 8 }}>{d.day}</td>
                      {d.buckets.map((b, idx) => (
                        <span key={`${d.day}-${idx}`}>
                          <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "right" }}>
                            {b.greenWithCars}
                          </td>
                          <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "right" }}>
                            {b.greenWithoutCarsPlusRedWithoutCars}
                          </td>
                          <td style={{ border: "1px solid #ddd", padding: 8, textAlign: "right" }}>
                            {b.redWithCars}
                          </td>
                        </span>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

