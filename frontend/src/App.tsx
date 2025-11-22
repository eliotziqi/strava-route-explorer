import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";

// react-leaflet types may not be available in the dev environment; cast to any for safety
const AnyMapContainer: any = MapContainer as any;

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState<'map' | 'list' | 'both'>('both');
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  // 页面加载时，从 URL 或 localStorage 读取 token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");

    if (t) {
      localStorage.setItem("strava_token", t);
      setToken(t);

      // 清掉 URL 里的 ?token=xxxx
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      const saved = localStorage.getItem("strava_token");
      if (saved) {
        setToken(saved);
      }
    }
  }, []);

  // Fetch activities when token is available
  useEffect(() => {
    if (!token) return;
    setErrorMsg(null);
    setLoadingActivities(true);

    const fetchActivities = async () => {
      try {
        const res = await fetch(`http://localhost:8000/activities?token=${token}`);
        if (!res.ok) {
          console.error("Failed to fetch activities", await res.text());
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setActivities(data);
          // default: select all activity ids
          const ids = data.map((a: any) => a.id).filter(Boolean) as number[];
          setSelectedIds(ids);
        } else {
          console.warn("Unexpected activities response", data);
        }
      } catch (err) {
        console.error("Error fetching activities", err);
        setErrorMsg("Failed to load activities");
      }
      finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [token]);

  // Fetch lines when selectedIds change
  useEffect(() => {
    // lines fetch is now done via `fetchLines` so we can also call it manually
    fetchLines();
  }, [token, selectedIds]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    const ids = activities.map((a: any) => a.id).filter(Boolean) as number[];
    setSelectedIds(ids);
  };

  const clearAll = () => setSelectedIds([]);

  // extract fetchLines so Refresh button can call it manually
  async function fetchLines() {
    if (!token) return;
    if (!selectedIds || selectedIds.length === 0) {
      setLines([]);
      return;
    }

    setLoadingLines(true);
    setErrorMsg(null);
    try {
      const qs = selectedIds.map((id) => `ids=${id}`).join("&");
      const res = await fetch(`http://localhost:8000/activity_lines?token=${token}&${qs}`);
      if (!res.ok) {
        const txt = await res.text();
        console.error("Failed to fetch activity lines", txt);
        setErrorMsg("Failed to load activity lines");
        return;
      }

      const data = await res.json();
      setLines(data || []);
    } catch (err) {
      console.error("Error fetching activity lines", err);
      setErrorMsg("Failed to load activity lines");
    } finally {
      setLoadingLines(false);
    }
  }

  const TabButton = ({ label, value }: { label: string; value: 'map' | 'list' | 'both' }) => (
    <button
      onClick={() => setViewTab(value)}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: viewTab === value ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.12)',
        background: viewTab === value ? 'rgba(255,76,2,0.12)' : 'transparent',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );

  function FitBounds({ lines }:{lines:any[]}){
    const map = useMap();
    useEffect(() => {
      if (!map || !lines || lines.length === 0) return;
      const allCoords: [number, number][] = [];
      for (const l of lines) {
        if (Array.isArray(l.coords)) {
          for (const c of l.coords) {
            // c is [lat, lng]
            allCoords.push([c[0], c[1]]);
          }
        }
      }
      if (allCoords.length === 0) return;
      map.fitBounds(allCoords as any, { padding: [40, 40] });
    }, [map, lines]);
    return null;
  }

  // 跳转到后端进行 Strava 登录
  const handleLogin = () => {
    window.location.href = "http://localhost:8000/auth/strava/login";
  };

  // 清除本地 token
  const handleLogout = () => {
    localStorage.removeItem("strava_token");
    setToken(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 24,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Route Explorer</h1>
      <p style={{ opacity: 0.8 }}>
        Connect your Strava account to explore your personal running & cycling routes.
      </p>

      {!token ? (
        <button
          onClick={handleLogin}
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            border: "none",
            background: "#fc4c02",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Login with Strava
        </button>
      ) : (
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          <h2>✅ Connected</h2>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            Your Strava token is saved locally.
          </p>

          <button
            onClick={handleLogout}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.8)",
              background: "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
          {/* Tab bar */}
          <div style={{ marginTop: 20, display: "flex", gap: 8, alignItems: "center" }}>
            <TabButton label="Map" value="map" />
            <TabButton label="List" value="list" />
            <TabButton label="Both" value="both" />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={selectAll} style={{ padding: '6px 10px', borderRadius: 8 }}>Select all</button>
              <button onClick={clearAll} style={{ padding: '6px 10px', borderRadius: 8 }}>Clear all</button>
              <button onClick={() => fetchLines()} style={{ padding: '6px 10px', borderRadius: 8 }}>Refresh</button>
            </div>
          </div>

          {/* Content area */}
          <div style={{ marginTop: 16 }}>
            {errorMsg && (
              <div style={{ background: 'rgba(255,0,0,0.08)', color: '#ffb4b4', padding: 8, borderRadius: 8, marginBottom: 12 }}>
                {errorMsg}
              </div>
            )}

            {viewTab === "list" && (
              <div style={{ maxWidth: 1200 }}>
                <h3 style={{ marginBottom: 8 }}>Recent Activities</h3>
                {loadingActivities ? (
                  <p style={{ opacity: 0.8 }}>Loading activities...</p>
                ) : activities.length === 0 ? (
                  <p style={{ opacity: 0.8 }}>No activities yet.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {activities.map((a) => {
                      const date = a.start_date ? a.start_date.split("T")[0] : "-";
                      const km = typeof a.distance === "number" ? (a.distance / 1000).toFixed(1) : "-";
                      return (
                        <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => toggleSelect(a.id)} />
                          <div style={{ fontSize: 13 }}>
                            <div style={{ opacity: 0.9 }}>{date} • {a.type} • {km} km</div>
                            <div style={{ opacity: 0.8 }}>{a.name}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {viewTab === "map" && (
              <div style={{ width: "100%" }}>
                <AnyMapContainer center={[0, 0] as any} zoom={2} style={{ height: '70vh', width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {loadingLines && (
                    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, background: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 6 }}>Loading lines...</div>
                  )}
                  {lines.map((l) => (
                    <Polyline key={l.id} positions={l.coords} pathOptions={{ color: "#ff4c02", weight: 3 }} />
                  ))}
                  <FitBounds lines={lines} />
                </AnyMapContainer>
              </div>
            )}

            {viewTab === "both" && (
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ width: 360, minWidth: 260 }}>
                  <h3 style={{ marginBottom: 8 }}>Recent Activities</h3>
                  {activities.length === 0 ? (
                    <p style={{ opacity: 0.8 }}>No activities yet.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {activities.map((a) => {
                        const date = a.start_date ? a.start_date.split("T")[0] : "-";
                        const km = typeof a.distance === "number" ? (a.distance / 1000).toFixed(1) : "-";
                        return (
                          <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => toggleSelect(a.id)} />
                            <div style={{ fontSize: 13 }}>
                              <div style={{ opacity: 0.9 }}>{date} • {a.type} • {km} km</div>
                              <div style={{ opacity: 0.8 }}>{a.name}</div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 300 }}>
                  <AnyMapContainer center={[0, 0] as any} zoom={2} style={{ height: 500, width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {loadingLines && (
                      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, background: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 6 }}>Loading lines...</div>
                    )}
                    {lines.map((l) => (
                      <Polyline key={l.id} positions={l.coords} pathOptions={{ color: "#ff4c02", weight: 3 }} />
                    ))}
                    <FitBounds lines={lines} />
                  </AnyMapContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
