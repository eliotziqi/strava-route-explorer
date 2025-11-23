import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ActivityView from './views/ActivityView';
import MapView from './views/MapView';
import DataView from './views/DataView';
import ProfileView from './views/ProfileView';
import appIcon from './assets/icon-app.png';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    // restore cached app state if present
    try {
      const rawActs = localStorage.getItem('rte_activities');
      const rawIds = localStorage.getItem('rte_selectedIds');
      if (rawActs) setActivities(JSON.parse(rawActs));
      if (rawIds) setSelectedIds(JSON.parse(rawIds));
    } catch (e) {
      console.warn('Failed to restore cached state', e);
    }
  }, []);

  // Note: activities are no longer auto-fetched when token appears.
  // Provide explicit controls on the Activity page to load recent 30 or load all.

  // No automatic network calls for lines — MapView computes polylines locally from activities

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // removed fetchLines — frontend will decode polylines locally from activities

  // Load recent activities (single page, per_page=30) and merge into state
  const loadRecentActivities = async () => {
    if (!token) {
      setErrorMsg('Please connect Strava first');
      return;
    }

    setLoadingActivities(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/activities?token=${token}&per_page=30&page=1`);
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to load recent activities', txt);
        setErrorMsg('Failed to load recent activities');
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) return;

      // merge with current activities (avoid duplicates)
      const merged = (() => {
        const byId = new Map(activities.map((a) => [a.id, a]));
        data.forEach((a: any) => byId.set(a.id, a));
        return Array.from(byId.values()).sort((x: any, y: any) => (y.start_date ?? '').localeCompare(x.start_date ?? ''));
      })();
      setActivities(merged);
      try { localStorage.setItem('rte_activities', JSON.stringify(merged)); } catch {}

      // add new ids to selection but don't remove existing ones
      const newIds = data.map((a: any) => a.id).filter(Boolean) as number[];
      const nextSelected = Array.from(new Set([...selectedIds, ...newIds]));
      setSelectedIds(nextSelected);
      try { localStorage.setItem('rte_selectedIds', JSON.stringify(nextSelected)); } catch {}

      // MapView will decode polylines from activities; no backend call here
    } catch (e) {
      console.error('Error loading recent activities', e);
      setErrorMsg('Failed to load recent activities');
    } finally {
      setLoadingActivities(false);
    }
  };

  // Load all activities (multiple pages). Backend handles paging when all=true.
  // Merges results into existing activities without duplicates.
  const loadAllActivities = async () => {
    if (!token) {
      setErrorMsg('Please connect Strava first');
      return;
    }

    setLoadingActivities(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/activities?token=${token}&all=true`);
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to load all activities', txt);
        setErrorMsg('Failed to load all activities');
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data)) return;

      const merged = (() => {
        const byId = new Map(activities.map((a) => [a.id, a]));
        data.forEach((a: any) => byId.set(a.id, a));
        return Array.from(byId.values()).sort((x: any, y: any) => (y.start_date ?? '').localeCompare(x.start_date ?? ''));
      })();
      setActivities(merged);
      try { localStorage.setItem('rte_activities', JSON.stringify(merged)); } catch {}

      const newIds = data.map((a: any) => a.id).filter(Boolean) as number[];
      const nextSelected = Array.from(new Set([...selectedIds, ...newIds]));
      setSelectedIds(nextSelected);
      try { localStorage.setItem('rte_selectedIds', JSON.stringify(nextSelected)); } catch {}

      // MapView will decode polylines from activities; no backend call here
    } catch (e) {
      console.error('Error loading all activities', e);
      setErrorMsg('Failed to load all activities');
    } finally {
      setLoadingActivities(false);
    }
  };

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
    // clear cached app data saved to localStorage
    try {
      localStorage.removeItem('rte_activities');
      localStorage.removeItem('rte_selectedIds');
      localStorage.removeItem('rte_lines');
    } catch (e) {
      // ignore
    }
    // clear local UI state so other views don't keep stale data
    setToken(null);
    setActivities([]);
    setSelectedIds([]);
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <img src={appIcon} style={{ width: 48, height: 48, borderRadius: 8 }} />

      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Route Explorer</h1>

      {/* Top tab bar (Activity / Map / Data / Profile) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <NavLink to="/profile" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Profile
        </NavLink>
        <NavLink to="/activity" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Activity
        </NavLink>
        <NavLink to="/data" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Data
        </NavLink>
        <NavLink to="/map" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Map
        </NavLink>
      </div>
    </div>

      <div className={`page`} style={{ marginTop: 16 }}>
        <main className="main">
          {errorMsg && (<div style={{ background: 'rgba(255,0,0,0.06)', color: '#ffb4b4', padding: 8, borderRadius: 8, marginBottom: 12 }}>{errorMsg}</div>)}

          <Routes>
            <Route path="/" element={<Navigate to="/activity" replace />} />
            <Route path="/profile" element={<ProfileView token={token} profile={profile} profileLoading={profileLoading} fetchProfile={fetchProfile} handleLogin={handleLogin} handleLogout={handleLogout} />} />
            <Route path="/activity" element={<ActivityView activities={activities} loadingActivities={loadingActivities} selectedIds={selectedIds} toggleSelect={toggleSelect} loadRecent={loadRecentActivities} loadAll={loadAllActivities} />} />
            <Route path="/map" element={<MapView activities={activities} selectedIds={selectedIds} />} />
            <Route path="/data" element={<DataView activities={activities} selectedIds={selectedIds} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
