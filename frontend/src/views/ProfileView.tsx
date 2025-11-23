export default function ProfileView({ token, profile, profileLoading, fetchProfile, handleLogin, handleLogout }: any) {
  // helper to render a metadata row
  const Row = ({ k, v }: { k: string; v: any }) => (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
      <div style={{ width: 160, opacity: 0.9 }}>{k}</div>
      <div style={{ flex: 1 }}>{v ?? '-'}</div>
    </div>
  );

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Profile</h2>

      {!token ? (
        <div style={{ padding: 20, borderRadius: 10, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div>Not yet connected to Strava. Click below to log in and authorize.</div>
          <button onClick={handleLogin} style={{ padding: '8px 12px', borderRadius: 8, background: '#fc4c02', color: 'white', border: 'none' }}>Connect with Strava</button>
        </div>
      ) : (
        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {profile?.profile_medium ? <img src={profile.profile_medium} alt="avatar" style={{ width: 48, height: 48, borderRadius: 24 }} /> : null}
              <div>
                <div style={{ fontWeight: 700 }}>{profile?.firstname ?? profile?.username ?? 'Unnamed'}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{profile?.city ?? ''}{profile?.state ? ` · ${profile.state}` : ''}{profile?.country ? ` · ${profile.country}` : ''}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={fetchProfile} disabled={profileLoading} style={{ padding: '8px 12px', borderRadius: 8, background: '#0ea5a0', color: 'white', border: 'none' }}>{profileLoading ? 'Refreshing...' : 'Refresh'}</button>
              <button onClick={handleLogout} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: 'white', border: '1px solid rgba(148,163,184,0.12)' }}>Logout</button>
            </div>
          </div>

          <div style={{ marginTop: 4 }}>
            <Row k="ID" v={profile?.id} />
            <Row k="Username" v={profile?.username} />
            <Row k="Name" v={`${profile?.firstname ?? ''} ${profile?.lastname ?? ''}`} />
            <Row k="Bio" v={profile?.bio} />
            <Row k="City / Country" v={`${profile?.city ?? ''}${profile?.city && profile?.country ? ' · ' : ''}${profile?.country ?? ''}`} />
            <Row k="Weight" v={profile?.weight ? `${profile.weight} kg` : '-'} />
          </div>

          <details style={{ marginTop: 8 }}>
            <summary>Raw profile JSON</summary>
            <pre className="json" style={{ marginTop: 8 }}>{JSON.stringify(profile ?? {}, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
