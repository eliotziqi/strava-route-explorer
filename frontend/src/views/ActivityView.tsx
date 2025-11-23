import React from 'react';

export default function ActivityView({ activities, loadingActivities, selectedIds, toggleSelect, loadRecent, loadAll }:
  { activities: any[]; loadingActivities: boolean; selectedIds: number[]; toggleSelect: (id:number)=>void, loadRecent: ()=>void, loadAll: ()=>void }){
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Activities</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={loadRecent} style={{ padding: '8px 12px', borderRadius: 8, background: '#0ea5a0', color: 'white', border: 'none' }}>{loadingActivities ? '加载中...' : 'Load Recent 30 Activities'}</button>
        <button onClick={loadAll} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: 'white', border: '1px solid rgba(148,163,184,0.12)' }}>{loadingActivities ? '加载中...' : 'Load All Activities'}</button>
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
            return (
              <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                <input type='checkbox' checked={selectedIds.includes(a.id)} onChange={() => toggleSelect(a.id)} />
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
