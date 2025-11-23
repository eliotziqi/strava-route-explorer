import { useMemo, useState } from 'react';
import polyline from 'polyline';
import { MapCanvas } from './MapCanvas';
import type { DecodedActivity } from './MapCanvas';
import { COLOR_SCHEMES } from '../../lib/heatmap';
import type { ColorSchemeId } from '../../lib/heatmap';

type MapViewProps = {
  activities: any[];
  selectedIds: number[];
  filterSports: string[];
  filterYears: string[];
  filterHasRoute: boolean;
  allSports?: string[];
  allYears?: string[];
};

export default function MapView({
  activities,
  selectedIds,
  filterSports,
  filterYears,
  filterHasRoute,
  allSports,
  allYears,
}: MapViewProps) {
  // 配色方案状态 + localStorage
  const [colorScheme, setColorScheme] = useState<ColorSchemeId>(
    () => (localStorage.getItem('re.heatColor') as ColorSchemeId) ?? 'warm',
  );

  const handleColorChange = (id: ColorSchemeId) => {
    setColorScheme(id);
    try {
      localStorage.setItem('re.heatColor', id);
    } catch {
      // ignore
    }
  };

  // 解码 polyline → DecodedActivity[]
  const decodedActivities: DecodedActivity[] = useMemo(() => {
    if (!activities || activities.length === 0) return [];

    const sel = new Set(selectedIds || []);
    const out: DecodedActivity[] = [];

    for (const a of activities) {
      if (!a) continue;
      if (sel.size > 0 && !sel.has(a.id)) continue;
      if (!a.polyline) continue;

      try {
        const coords = polyline
          .decode(a.polyline)
          .map(([lat, lng]: any) => [lat, lng] as [number, number]);
        out.push({
          id: a.id,
          name: a.name,
          type: a.type,
          date: a.start_date,
          points: coords,
        });
      } catch {
        // ignore bad polyline
        continue;
      }
    }

    return out;
  }, [activities, selectedIds]);

  // summary labels（沿用你原来的逻辑）
  const sportsLabel = (() => {
    if (!filterSports || filterSports.length === 0) return 'None';
    if (allSports && filterSports.length === allSports.length) return 'All';
    return filterSports.join(', ');
  })();

  const yearsLabel = (() => {
    if (!filterYears || filterYears.length === 0) return 'None';
    if (allYears && filterYears.length === allYears.length) return 'All';
    return filterYears.join(', ');
  })();

  const extraFlags: string[] = [];
  if (filterHasRoute) extraFlags.push('Only with route');

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Map</h2>
      <p
        style={{
          fontSize: 13,
          opacity: 0.8,
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        <span>Sports: {sportsLabel}</span>
        <span style={{ margin: '0 8px' }}>|</span>
        <span>Years: {yearsLabel}</span>
        {extraFlags.length > 0 && (
          <>
            <span style={{ margin: '0 8px' }}>|</span>
            <span>{extraFlags.join(' · ')}</span>
          </>
        )}
      </p>

      {/* 配色方案选择 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {Object.keys(COLOR_SCHEMES).map((k) => {
          const id = k as ColorSchemeId;
          const active = id === colorScheme;
          return (
            <button
              key={id}
              onClick={() => handleColorChange(id)}
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                border: active
                  ? '1px solid #ffb86b'
                  : '1px solid rgba(255,255,255,0.06)',
                background: active
                  ? 'rgba(255,184,107,0.08)'
                  : 'transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {id}
            </button>
          );
        })}
      </div>

      {/* 实际地图渲染 */}
      <MapCanvas activities={decodedActivities} colorScheme={colorScheme} />
    </div>
  );
}
