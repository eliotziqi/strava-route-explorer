import { useEffect, useState } from "react";

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);


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
        } else {
          console.warn("Unexpected activities response", data);
        }
      } catch (err) {
        console.error("Error fetching activities", err);
      }
    };

    fetchActivities();
  }, [token]);

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
        padding: "40px 24px",
        fontFamily: "system-ui, sans-serif",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
            textAlign: "center",
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
          {/* Activities list */}
          <div style={{ marginTop: 20, textAlign: "left", maxWidth: 720 }}>
            <h3 style={{ marginBottom: 8 }}>Recent Activities</h3>
            {activities.length === 0 ? (
              <p style={{ opacity: 0.8 }}>No activities yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activities.map((a) => {
                  const date = a.start_date ? a.start_date.split("T")[0] : "-";
                  const km = typeof a.distance === "number" ? (a.distance / 1000).toFixed(1) : "-";
                  return (
                    <div
                      key={a.id}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(148,163,184,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 110, opacity: 0.9 }}>{date}</div>
                      <div style={{ minWidth: 80 }}>{a.type}</div>
                      <div style={{ minWidth: 90 }}>{km} km</div>
                      <div style={{ flex: 1, textAlign: "left", opacity: 0.95 }}>{a.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
