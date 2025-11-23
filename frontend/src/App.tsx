import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { NavLink, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ActivityView from './views/ActivityView';
import MapView from './views/MapView';
import DataView from './views/DataView';
import ProfileView from './views/ProfileView';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();


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

  // fetch profile helper
  const fetchProfile = async () => {
    if (!token) return;
    setProfileLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/me?token=${token}`);
      if (!res.ok) {
        setErrorMsg('Failed to fetch profile');
        return;
      }
      const p = await res.json();
      setProfile(p);
    } catch (e) {
      setErrorMsg('Failed to fetch profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Auto-fetch profile when token becomes available (e.g. after OAuth redirect)
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [token]);

  

  

  // 跳转到后端进行 Strava 登录
  const handleLogin = () => {
    window.location.href = "http://localhost:8000/auth/strava/login";
  };

  // 清除本地 token — 先请求后端撤销 token，再清本地状态
  const handleLogout = async () => {
    if (token) {
      try {
        // call backend revoke endpoint; backend will call Strava deauthorize
        await fetch(`http://localhost:8000/auth/strava/revoke?token=${token}`, { method: 'POST' });
      } catch (e) {
        // ignore network errors — continue to clear local state
        console.warn("Failed to contact revoke endpoint", e);
      }
    }

    localStorage.removeItem("strava_token");
    // clear local UI state so other views don't keep stale data
    setToken(null);
    setActivities([]);
    setSelectedIds([]);
    setLines([]);
    setProfile(null);
    setErrorMsg(null);
    // navigate to profile view after logout
    try {
      navigate('/profile');
    } catch (e) {
      // navigate may not be defined in some test contexts
    }
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

      {/* Top tab bar (Activity / Map / Data / Profile) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <NavLink to="/activity" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Activity
        </NavLink>
        <NavLink to="/map" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Map
        </NavLink>
        <NavLink to="/data" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Data
        </NavLink>
        <NavLink to="/profile" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Profile
        </NavLink>
      </div>

      <div className={`page`} style={{ marginTop: 16 }}>
        <main className="main">
          {errorMsg && (<div style={{ background: 'rgba(255,0,0,0.06)', color: '#ffb4b4', padding: 8, borderRadius: 8, marginBottom: 12 }}>{errorMsg}</div>)}

          <Routes>
            <Route path="/" element={<Navigate to="/activity" replace />} />
            <Route path="/activity" element={<ActivityView activities={activities} loadingActivities={loadingActivities} selectedIds={selectedIds} toggleSelect={toggleSelect} />} />
            <Route path="/map" element={<MapView lines={lines} loadingLines={loadingLines} />} />
            <Route path="/data" element={<DataView activities={activities} lines={lines} />} />
            <Route path="/profile" element={<ProfileView token={token} profile={profile} profileLoading={profileLoading} fetchProfile={fetchProfile} handleLogin={handleLogin} handleLogout={handleLogout} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
