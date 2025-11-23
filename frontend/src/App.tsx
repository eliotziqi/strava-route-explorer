import { useEffect, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ActivityView from './views/ActivityView';
import MapView from './views/MapView';
import StatView from './views/StatView';
import ProfileView from './views/ProfileView';
import appIcon from './assets/icon-app.png';

function App() {
  const [token, setToken] = useState<string | null>(null);
  type TokenBundle = {
    access_token: string;
    refresh_token: string;
    expires_at: number; // unix seconds
  };

  const [tokenBundle, setTokenBundle] = useState<TokenBundle | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  
  const [filterSports, setFilterSports] = useState<string[]>([]);
  const [filterYears, setFilterYears] = useState<string[]>([]);
  const [filterHasRoute, setFilterHasRoute] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();


  // 页面加载时：解析 URL 中的 token bundle 或从 localStorage 恢复
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const at = params.get("access_token");
    const rt = params.get("refresh_token");
    const exp = params.get("expires_at");

    if (at && rt && exp) {
      const bundle: TokenBundle = {
        access_token: at,
        refresh_token: rt,
        expires_at: Number(exp),
      };
      setTokenBundle(bundle);
      try { localStorage.setItem('strava_token_bundle', JSON.stringify(bundle)); } catch {}

      // 清掉 URL 参数
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      // 尝试从 localStorage 恢复
      const raw = localStorage.getItem('strava_token_bundle');
      if (raw) {
        try {
          const saved = JSON.parse(raw) as TokenBundle;
          setTokenBundle(saved);
        } catch (e) {
          console.warn('Failed to parse token bundle', e);
        }
      }
    }

    // 恢复活动与选择缓存
    try {
      const rawActs = localStorage.getItem('rte_activities');
      const rawIds = localStorage.getItem('rte_selectedIds');
      if (rawActs) setActivities(JSON.parse(rawActs));
      if (rawIds) setSelectedIds(JSON.parse(rawIds));
    } catch (e) {
      console.warn('Failed to restore cached state', e);
    }
  }, []);

  // 映射 tokenBundle -> 旧的 token state，保持兼容
  useEffect(() => {
    if (tokenBundle?.access_token) {
      setToken(tokenBundle.access_token);
    } else {
      setToken(null);
    }
  }, [tokenBundle]);

  // Note: activities are no longer auto-fetched when token appears.
  // Provide explicit controls on the Activity page to load recent 30 or load all.

  // No automatic network calls for lines — MapView computes polylines locally from activities

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // removed fetchLines — frontend will decode polylines locally from activities

  // Load recent activities (single page, per_page=30) and merge into state
  const loadRecentActivities = async () => {
    setLoadingActivities(true);
    setErrorMsg(null);
    try {
      const res = await fetchWithAutoRefresh('http://localhost:8000/activities', { per_page: '30', page: '1' });
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
    setLoadingActivities(true);
    setErrorMsg(null);
    try {
      const res = await fetchWithAutoRefresh('http://localhost:8000/activities', { all: 'true' });
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
    setProfileLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchWithAutoRefresh("http://localhost:8000/me");
      if (!res.ok) {
        setErrorMsg('Failed to fetch profile');
        return;
      }
      const p = await res.json();
      setProfile(p);
    } catch (e) {
      console.error('Error fetching profile', e);
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

  // ---------- Token refresh helpers ----------
  async function refreshTokenIfNeeded(): Promise<string | null> {
    if (!tokenBundle) return null;

    const now = Math.floor(Date.now() / 1000);
    // 提前 60 秒刷新
    if (tokenBundle.expires_at > now + 60) {
      return tokenBundle.access_token;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/auth/strava/refresh?refresh_token=${tokenBundle.refresh_token}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        console.error('Failed to refresh token', await res.text());
        return null;
      }

      const data = await res.json();
      const newBundle = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      } as const;

      setTokenBundle(newBundle as any);
      try { localStorage.setItem('strava_token_bundle', JSON.stringify(newBundle)); } catch {}
      return newBundle.access_token;
    } catch (e) {
      console.error('Error refreshing token', e);
      return null;
    }
  }

  async function fetchWithAutoRefresh(
    input: string,
    extraParams?: Record<string, string>,
    init?: RequestInit
  ): Promise<Response> {
    const effectiveToken = await refreshTokenIfNeeded();
    if (!effectiveToken) {
      throw new Error('No valid Strava token');
    }

    const url = new URL(input);
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    url.searchParams.set('token', effectiveToken);

    let res = await fetch(url.toString(), init);

    if (res.status === 401) {
      console.warn('Got 401, trying to refresh token...');
      const refreshed = await refreshTokenIfNeeded();
      if (!refreshed) return res;

      url.searchParams.set('token', refreshed);
      res = await fetch(url.toString(), init);
    }

    return res;
  }

  // compute filteredActivities from activities + filter state
  const filteredActivities = useMemo(() => {
    return (activities || []).filter((a) => {
      if (!a) return false;
      // Sports 多选：如果没有选项（空数组）则视为没有通过任何 sport
      if (filterSports.length === 0 || !filterSports.includes(a.type)) return false;

      // Years 多选：同样，如果没有年份被选中则不通过
      if (!a.start_date) return false;
      const y = new Date(a.start_date).getFullYear().toString();
      if (filterYears.length === 0 || !filterYears.includes(y)) return false;

      if (filterHasRoute && !a.polyline) return false;

      return true;
    });
  }, [activities, filterSports, filterYears, filterHasRoute]);

  // compute all possible sports and years from activities (used to initialize full-selection)
  const allSports = useMemo(() => {
    const s = new Set<string>();
    (activities || []).forEach((a) => { if (a?.type) s.add(a.type); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [activities]);

  const allYears = useMemo(() => {
    const s = new Set<string>();
    (activities || []).forEach((a) => {
      if (!a?.start_date) return;
      const y = new Date(a.start_date).getFullYear().toString();
      s.add(y);
    });
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [activities]);

  // initialize filters to "all selected" automatically when activities first appear
  useEffect(() => {
    if ((activities || []).length === 0) return;
    if ((filterSports || []).length === 0 && allSports.length > 0) {
      setFilterSports(allSports);
    }
    if ((filterYears || []).length === 0 && allYears.length > 0) {
      setFilterYears(allYears);
    }
    // only run when activities/all lists change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, allSports, allYears]);

  

  

  // 跳转到后端进行 Strava 登录
  const handleLogin = () => {
    window.location.href = "http://localhost:8000/auth/strava/login";
  };

  // 清除本地 token — 先请求后端撤销 token，再清本地状态
  const handleLogout = async () => {
    const currentAccess = tokenBundle?.access_token || token;
    if (currentAccess) {
      try {
        await fetch(`http://localhost:8000/auth/strava/revoke?token=${currentAccess}`, { method: 'POST' });
      } catch (e) {
        console.warn("Failed to contact revoke endpoint", e);
      }
    }

    // clear cached token bundle
    try { localStorage.removeItem('strava_token_bundle'); } catch {}
    try {
      localStorage.removeItem('rte_activities');
      localStorage.removeItem('rte_selectedIds');
      
    } catch (e) {}

    // clear local UI state so other views don't keep stale data
    setTokenBundle(null);
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

      {/* Top tab bar (Profile / Activity / Stats / Map) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <NavLink to="/profile" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Profile
        </NavLink>
        <NavLink to="/activity" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Activity
        </NavLink>
        <NavLink to="/stat" style={({isActive}) => ({ padding: '8px 12px', borderRadius: 8, border: isActive ? '1px solid #ffbfa6' : '1px solid rgba(148,163,184,0.06)', background: isActive ? 'rgba(255,76,2,0.08)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600 })}>
          Stats
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
            <Route
              path="/profile"
              element={
                <ProfileView
                  token={token}
                  profile={profile}
                  profileLoading={profileLoading}
                  fetchProfile={fetchProfile}
                  handleLogin={handleLogin}
                  handleLogout={handleLogout}
                  activities={activities}
                  selectedIds={selectedIds}
                />
              }
            />
            <Route
              path="/activity"
              element={
                <ActivityView
                  activities={filteredActivities}
                  allSports={allSports}
                  allYears={allYears}
                  loadingActivities={loadingActivities}
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  loadRecent={loadRecentActivities}
                  loadAll={loadAllActivities}
                  filterSports={filterSports}
                  setFilterSports={setFilterSports}
                  filterYears={filterYears}
                  setFilterYears={setFilterYears}
                  filterHasRoute={filterHasRoute}
                  setFilterHasRoute={setFilterHasRoute}
                />
              }
            />
            <Route path="/map" element={<MapView activities={filteredActivities} selectedIds={selectedIds} filterSports={filterSports} filterYears={filterYears} filterHasRoute={filterHasRoute} allSports={allSports} allYears={allYears} />} />
            <Route
              path="/stat"
              element={
                <StatView
                  activities={filteredActivities}
                  selectedIds={selectedIds}
                  filterSports={filterSports}
                  filterYears={filterYears}
                  filterHasRoute={filterHasRoute}
                  allSports={allSports}
                  allYears={allYears}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
