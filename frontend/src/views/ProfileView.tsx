import { useMemo } from 'react';
import polyline from 'polyline';

type ProfileViewProps = {
  token: string | null;
  profile: any;
  profileLoading: boolean;
  fetchProfile: () => void;
  handleLogin: () => void;
  handleLogout: () => void;
  activities: any[];
  selectedIds: number[];
};

export default function ProfileView({
  token,
  profile,
  profileLoading,
  fetchProfile,
  handleLogin,
  handleLogout,
  activities,
  selectedIds,
}: ProfileViewProps) {
  // helper to render a metadata row
  const Row = ({ k, v }: { k: string; v: any }) => (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '6px 0',
        borderBottom: '1px solid rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ width: 160, opacity: 0.9 }}>{k}</div>
      <div style={{ flex: 1 }}>{v ?? '-'}</div>
    </div>
  );

  // === 原来 DataView 里的 lines 计算逻辑，搬到这里 ===
  const lines = useMemo(() => {
    const sel = new Set(selectedIds || []);
    const out: any[] = [];
    for (const a of activities || []) {
      if (!a) continue;
      if (sel.size > 0 && !sel.has(a.id)) continue;
      const p = a.polyline;
      if (!p) continue;
      try {
        const coords = polyline.decode(p).map(([lat, lng]: any) => [lat, lng]);
        out.push({ id: a.id, coords });
      } catch {
        continue;
      }
    }
    return out;
  }, [activities, selectedIds]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Profile</h2>

      {/* ===== 上半部分：Profile（你原来的内容） ===== */}
      {!token ? (
        <div
          style={{
            padding: 20,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div>
            Not yet connected to Strava. Click below to log in and authorize.
          </div>
          <button
            onClick={handleLogin}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: '#fc4c02',
              color: 'white',
              border: 'none',
            }}
          >
            Connect with Strava
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {profile?.profile_medium ? (
                <img
                  src={profile.profile_medium}
                  alt="avatar"
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                />
              ) : null}
              <div>
                <div style={{ fontWeight: 700 }}>
                  {profile?.firstname ?? profile?.username ?? 'Unnamed'}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {profile?.city ?? ''}
                  {profile?.state ? ` · ${profile.state}` : ''}
                  {profile?.country ? ` · ${profile.country}` : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={fetchProfile}
                disabled={profileLoading}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#0ea5a0',
                  color: 'white',
                  border: 'none',
                }}
              >
                {profileLoading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(148,163,184,0.12)',
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <div style={{ marginTop: 4 }}>
            <Row k="ID" v={profile?.id} />
            <Row k="Username" v={profile?.username} />
            <Row
              k="Name"
              v={`${profile?.firstname ?? ''} ${profile?.lastname ?? ''}`}
            />
            <Row k="Bio" v={profile?.bio} />
            <Row
              k="City / Country"
              v={`${profile?.city ?? ''}${
                profile?.city && profile?.country ? ' · ' : ''
              }${profile?.country ?? ''}`}
            />
            <Row
              k="Weight"
              v={profile?.weight ? `${profile.weight} kg` : '-'}
            />
          </div>
        </div>
      )}

      {/* ===== 下半部分：原 DataView 内容，放到 Profile 后面 ===== */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ margin: '0 0 8px' }}>Data Debug</h3>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            <summary>Raw profile JSON</summary>
            <pre className="json" style={{ marginTop: 8 }}>
              {JSON.stringify(profile ?? {}, null, 2)}
            </pre>
          </details>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            <summary>Activities JSON</summary>
            <pre className="json">{JSON.stringify(activities, null, 2)}</pre>
          </details>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            <summary>Lines JSON</summary>
            <pre className="json">{JSON.stringify(lines, null, 2)}</pre>
          </details>
      </div>
    </div>
  );
}
