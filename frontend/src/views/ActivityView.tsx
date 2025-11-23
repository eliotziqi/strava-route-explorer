import { useMemo, useState } from 'react';

type Props = {
  activities: any[];            // 已过滤的
  allSports: string[];          // 全部可选运动类型（由 App 提供）
  allYears: string[];           // 全部可选年份（由 App 提供）
  loadingActivities: boolean;
  selectedIds: number[];
  toggleSelect: (id: number) => void;
  loadRecent: () => void;
  loadAll: () => void;
  filterSports: string[];
  setFilterSports: (v: string[]) => void;
  filterYears: string[];
  setFilterYears: (v: string[]) => void;
  filterHasRoute: boolean;
  setFilterHasRoute: (v: boolean) => void;
};

export default function ActivityView({
  activities,
  allSports,
  allYears,
  loadingActivities,
  selectedIds,
  toggleSelect,
  loadRecent,
  loadAll,
  filterSports,
  setFilterSports,
  filterYears,
  setFilterYears,
  filterHasRoute,
  setFilterHasRoute,
}: Props) {
  const disabled = loadingActivities === true;
  const [sortKey, setSortKey] = useState<'date-desc' | 'distance-desc'>('date-desc');

  // 使用由 App 提供的完整选项集合
  const sportOptions = allSports || [];
  const yearOptions = allYears || [];

  // 辅助：判断当前是否“等价于全选”（当选中数量等于全部可选数量）
  const isSportAll = sportOptions.length > 0 && filterSports.length === sportOptions.length;
  const isYearAll = yearOptions.length > 0 && filterYears.length === yearOptions.length;

  const toggleSport = (s: string) => {
    if (filterSports.includes(s)) {
      setFilterSports(filterSports.filter((x) => x !== s));
    } else {
      setFilterSports([...filterSports, s]);
    }
  };

  const toggleYear = (y: string) => {
    if (filterYears.includes(y)) {
      setFilterYears(filterYears.filter((x) => x !== y));
    } else {
      setFilterYears([...filterYears, y]);
    }
  };

  const handleSportAll = () => {
    // 有筛选 ⇒ 清空（视为全部）
    // 没筛选 ⇒ 选中全部
    if (isSportAll) {
      // currently all selected -> toggle to none
      setFilterSports([]);
    } else {
      setFilterSports(sportOptions);
    }
  };

  const handleYearAll = () => {
    if (isYearAll) {
      setFilterYears([]);
    } else {
      setFilterYears(yearOptions);
    }
  };

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

  // 小组件：pill 样式按钮
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 999,
    border: active ? '1px solid #f97316' : '1px solid rgba(148,163,184,0.4)',
    background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Activities</h2>

      {/* 筛选区 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {/* Sports row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Sports:</span>
          <button type="button" onClick={handleSportAll} style={pillStyle(isSportAll)}>
            All
          </button>
          {sportOptions.map((s) => (
            <button key={s} type="button" onClick={() => toggleSport(s)} style={pillStyle(filterSports.includes(s))}>
              {s}
            </button>
          ))}
        </div>

        {/* Years row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Years:</span>
          <button type="button" onClick={handleYearAll} style={pillStyle(isYearAll)}>
            All
          </button>
          {yearOptions.map((y) => (
            <button key={y} type="button" onClick={() => toggleYear(y)} style={pillStyle(filterYears.includes(y))}>
              {y}
            </button>
          ))}
        </div>

        {/* Only with route + 排序 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={filterHasRoute}
              onChange={(e) => setFilterHasRoute(e.target.checked)}
            />
            Only with route
          </label>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, fontSize: 13 }}>
            <span style={{ opacity: 0.8 }}>Sort:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              style={{ padding: 4, borderRadius: 8, fontSize: 13 }}
            >
              <option value="date-desc">Newest first</option>
              <option value="distance-desc">Longest first</option>
            </select>
          </div>
        </div>
      </div>

      {/* 加载按钮 */}
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
