export default function ActivityView({ activities, loadingActivities, selectedIds, toggleSelect, loadRecent, loadAll }:
  { activities: any[]; loadingActivities: boolean; selectedIds: number[]; toggleSelect: (id:number)=>void, loadRecent: ()=>void, loadAll: ()=>void }){
  const disabled = loadingActivities === true;

  const handleLoadAll = () => {
    if (disabled) return;
    const ok = window.confirm('Load All may perform multiple requests to Strava (one per page). Continue?');
    if (!ok) return;
    loadAll();
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Activities</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button disabled={disabled} onClick={() => !disabled && loadRecent()} style={{ padding: '8px 12px', borderRadius: 8, background: '#0ea5a0', color: 'white', border: 'none' }}>{loadingActivities ? 'Loading...' : 'Load Recent 30 Activities'}</button>
        <button disabled={disabled} onClick={handleLoadAll} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: 'white', border: '1px solid rgba(148,163,184,0.12)' }}>{loadingActivities ? 'Loading...' : 'Load All Activities'}</button>
      </div>

      {loadingActivities ? (
        <p style={{ opacity: 0.8 }}>Loading activities...</p>
      ) : activities.length === 0 ? (
        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ margin: 0 }}>No activities are currently available. Use the buttons above to load activities.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activities.map((a) => {
            const date = a.start_date ? a.start_date.split('T')[0] : '-';
            const km = typeof a.distance === 'number' ? (a.distance / 1000).toFixed(1) : '-';
            const hasPolyline = !!a.polyline;
            return (
              <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                <input type='checkbox' checked={selectedIds.includes(a.id)} onChange={() => toggleSelect(a.id)} />
                <div style={{ width: 10, height: 10, borderRadius: 5, background: hasPolyline ? '#10b981' : 'transparent', border: hasPolyline ? 'none' : '1px solid rgba(255,255,255,0.12)' }} title={hasPolyline ? 'Has route polyline' : 'No route polyline'} />
                <div style={{ fontSize: 14 }}>
                  <div style={{ fontWeight: 700 }}>{a.name}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>{date} • {a.type} • {km} km</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
