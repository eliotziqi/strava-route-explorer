import { useMemo, useState } from 'react';

type Props = {
  activities: any[];             // 已经过滤后的
  allActivities: any[];          // 全部原始活动，用来生成年份列表
  loadingActivities: boolean;
  selectedIds: number[];
  toggleSelect: (id: number) => void;
  loadRecent: () => void;
  loadAll: () => void;
  filterSport: 'all' | 'Ride' | 'Run' | 'Walk';
  setFilterSport: (v: 'all' | 'Ride' | 'Run' | 'Walk') => void;
  filterYear: 'all' | string;
  setFilterYear: (v: 'all' | string) => void;
  filterHasRoute: boolean;
  setFilterHasRoute: (v: boolean) => void;
};

export default function ActivityView({
  activities,
  allActivities,
  loadingActivities,
  selectedIds,
  toggleSelect,
  loadRecent,
  loadAll,
  filterSport,
  setFilterSport,
  filterYear,
  setFilterYear,
  filterHasRoute,
  setFilterHasRoute,
}: Props) {
  const disabled = loadingActivities === true;

  // 👉 排序只在 ActivityView 里生效，不影响 Stats
  const [sortKey, setSortKey] = useState<'date-desc' | 'distance-desc'>('date-desc');

  // 年份选项，从 allActivities 自动生成
  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    (allActivities || []).forEach((a) => {
      if (!a?.start_date) return;
      const y = new Date(a.start_date).getFullYear().toString();
      set.add(y);
    });
    return ['all', ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
  }, [allActivities]);

  // 基于 sortKey 对「已过滤结果」排序
  const sortedActivities = useMemo(() => {
    const arr = [...(activities || [])];
    if (sortKey === 'date-desc') {
      arr.sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''));
    } else if (sortKey === 'distance-desc') {
      arr.sort((a, b) => (b.distance || 0) - (a.distance || 0));
    }
    return arr;
  }, [activities, sortKey]);

  const handleLoadAll = () => {
    if (disabled) return;
    const ok = window.confirm(
      'Load All may perform multiple requests to Strava (one per page). Continue?'
    );
    if (!ok) return;
    loadAll();
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Activities</h2>

      {/* 筛选区 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value as any)}
          style={{ padding: 6, borderRadius: 8 }}
        >
          <option value="all">All sports</option>
          <option value="Ride">Ride</option>
          <option value="Run">Run</option>
          <option value="Walk">Walk</option>
        </select>

        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value as any)}
          style={{ padding: 6, borderRadius: 8 }}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y === 'all' ? 'All years' : y}
            </option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={filterHasRoute}
            onChange={(e) => setFilterHasRoute(e.target.checked)}
          />
          Only with route
        </label>

        {/* 排序（本地 state，不影响 Stats） */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as any)}
          style={{ padding: 6, borderRadius: 8, marginLeft: 'auto' }}
        >
          <option value="date-desc">Newest first</option>
          <option value="distance-desc">Longest first</option>
        </select>
      </div>

      {/* 加载按钮区域 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          disabled={disabled}
          onClick={() => !disabled && loadRecent()}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: '#0ea5a0',
            color: 'white',
            border: 'none',
          }}
        >
          {loadingActivities ? 'Loading...' : 'Load Recent 30 Activities'}
        </button>
        <button
          disabled={disabled}
          onClick={handleLoadAll}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'transparent',
            color: 'white',
            border: '1px solid rgba(148,163,184,0.12)',
          }}
        >
          {loadingActivities ? 'Loading...' : 'Load All Activities'}
        </button>
      </div>

      {/* 列表 */}
      {loadingActivities ? (
        <p style={{ opacity: 0.8 }}>Loading activities...</p>
      ) : sortedActivities.length === 0 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <p style={{ margin: 0 }}>
            No activities match current filters. Try changing filters or load activities.
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {sortedActivities.map((a) => {
            const date = a.start_date ? a.start_date.split('T')[0] : '-';
            const km =
              typeof a.distance === 'number' ? (a.distance / 1000).toFixed(1) : '-';
            const hasPolyline = !!a.polyline;
            return (
              <li
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(a.id)}
                  onChange={() => toggleSelect(a.id)}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: hasPolyline ? '#10b981' : 'transparent',
                    border: hasPolyline
                      ? 'none'
                      : '1px solid rgba(255,255,255,0.12)',
                  }}
                  title={hasPolyline ? 'Has route polyline' : 'No route polyline'}
                />
                <div style={{ fontSize: 14 }}>
                  <div style={{ fontWeight: 700 }}>{a.name}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    {date} • {a.type} • {km} km
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
