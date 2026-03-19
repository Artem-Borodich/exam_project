import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Zone = { id: number; name: string };
type ReportResponse = {
  report: {
    id: number;
    googleDocUrl: string | null;
    googleDocId: string | null;
  };
};

function toIsoFromLocalInput(value: string) {
  // datetime-local: "YYYY-MM-DDTHH:mm"
  const d = new Date(value);
  return d.toISOString();
}

export function ReportsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>([]);

  const [fromAt, setFromAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 16);
  });
  const [toAt, setToAt] = useState<string>(() => new Date().toISOString().slice(0, 16));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Zone[]>("/zones")
      .then(({ data }) => setZones(data))
      .catch(() => {});
  }, []);

  const selectedSet = useMemo(() => new Set(selectedZoneIds), [selectedZoneIds]);

  async function generate() {
    setLoading(true);
    setError(null);
    setDocUrl(null);
    try {
      const result = await api.post<ReportResponse>("/reports/generate", {
        fromAt: toIsoFromLocalInput(fromAt),
        toAt: toIsoFromLocalInput(toAt),
        zoneIds: selectedZoneIds,
      });
      setDocUrl(result.data.report.googleDocUrl ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Generate report failed");
    } finally {
      setLoading(false);
    }
  }

  async function syncObservations() {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await api.post<{ processed: number; upserted: number; skipped: number }>(
        "/observations/sync",
        {}
      );
      setSyncResult(
        `processed=${res.data.processed}, upserted=${res.data.upserted}, skipped=${res.data.skipped}`
      );
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Sync failed");
    } finally {
      setSyncLoading(false);
    }
  }

  function toggleZone(id: number) {
    setSelectedZoneIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h1>Reports</h1>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Generate Google Docs report</div>

          <button
            onClick={syncObservations}
            disabled={syncLoading}
            style={{ width: "100%", padding: "10px 14px", marginBottom: 12 }}
          >
            {syncLoading ? "Syncing..." : "Sync observations from Google Sheets"}
          </button>
          {syncResult ? <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>{syncResult}</div> : null}

          <div style={{ marginBottom: 12 }}>
            <label>From</label>
            <input
              type="datetime-local"
              value={fromAt}
              onChange={(e) => setFromAt(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>To</label>
            <input
              type="datetime-local"
              value={toAt}
              onChange={(e) => setToAt(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Zones</div>
            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
              {zones.map((z) => (
                <label key={z.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(z.id)}
                    onChange={() => toggleZone(z.id)}
                  />
                  <span>{z.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || selectedZoneIds.length === 0}
            style={{ width: "100%", padding: "10px 14px" }}
          >
            {loading ? "Generating..." : "Generate report"}
          </button>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Result</div>
          {docUrl ? (
            <a href={docUrl} target="_blank" rel="noreferrer">
              Open Google Doc
            </a>
          ) : (
            <div style={{ color: "#666" }}>
              Generate a report to create a Google Docs document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

