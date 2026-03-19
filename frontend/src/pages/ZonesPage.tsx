import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

type PolygonPoint = { lat: number; lng: number };
type Zone = {
  id: number;
  name: string;
  polygon: PolygonPoint[];
  createdAt: string;
};

function ClickCapture({
  onAddPoint,
}: {
  onAddPoint: (p: PolygonPoint) => void;
}) {
  useMapEvents({
    click(e) {
      onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Leaflet by default uses broken marker icons in some bundlers.
// This fixes it by setting icons explicitly.
const markerIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function ZonesPage() {
  const roleName = useAuthStore((s) => s.user?.roleName ?? null);
  const canCreate = roleName === "MANAGER";

  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");
  const [points, setPoints] = useState<PolygonPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const center = useMemo(() => {
    // Default center (Moscow)
    return points.length > 0 ? [points[0].lat, points[0].lng] : [55.751244, 37.618423];
  }, [points]);

  async function loadZones() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Zone[]>("/zones");
      setZones(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load zones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadZones().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createZone() {
    if (points.length < 3) {
      setError("Polygon must contain at least 3 points.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/zones", { name, polygon: points });
      setName("");
      setPoints([]);
      await loadZones();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Create zone failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h1>Zones</h1>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          <MapContainer
            center={center as [number, number]}
            zoom={12}
            style={{ height: 420, width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {canCreate ? (
              <ClickCapture onAddPoint={(p) => setPoints((prev) => [...prev, p])} />
            ) : null}
            {points.length >= 3 ? <Polygon positions={points as any} /> : null}
            {points.map((p, idx) => (
              <Marker key={`${p.lat}-${p.lng}-${idx}`} position={[p.lat, p.lng]} icon={markerIcon} />
            ))}
          </MapContainer>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Create zone</div>
          {!canCreate ? (
            <div style={{ color: "#666", fontSize: 13, marginBottom: 10 }}>
              Only manager can create zones.
            </div>
          ) : null}

          <div style={{ marginBottom: 12 }}>
            <label>Zone name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              placeholder="e.g. Zone A"
              disabled={!canCreate}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Polygon points: {points.length}</div>
            <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
              {points.map((p, i) => (
                <div key={i} style={{ fontFamily: "monospace", fontSize: 12, color: "#333" }}>
                  {i + 1}. lat={p.lat.toFixed(5)} lng={p.lng.toFixed(5)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPoints((prev) => prev.slice(0, -1))}
              disabled={!canCreate || points.length === 0 || loading}
              style={{ padding: "8px 12px" }}
            >
              Undo
            </button>
            <button
              onClick={() => setPoints([])}
              disabled={!canCreate || points.length === 0 || loading}
              style={{ padding: "8px 12px" }}
            >
              Clear
            </button>
          </div>

          <button
            disabled={!canCreate || loading || !name.trim()}
            onClick={createZone}
            style={{ marginTop: 12, width: "100%", padding: "10px 14px" }}
          >
            {loading ? "Saving..." : "Save zone"}
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 26 }}>Existing zones</h2>
      {loading ? <div>Loading...</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14 }}>
        {zones.map((z) => (
          <div key={z.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{z.name}</div>
            <div style={{ color: "#555", fontSize: 12 }}>
              Points: {z.polygon.length}
            </div>
            <div style={{ color: "#777", fontSize: 12, marginTop: 8 }}>
              Created: {new Date(z.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

