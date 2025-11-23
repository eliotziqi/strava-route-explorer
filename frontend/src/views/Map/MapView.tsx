import { useMemo, useState } from 'react';
import polyline from 'polyline';
import { MapCanvas } from './MapCanvas';
import type { DecodedActivity, BaseLayerId } from './MapCanvas';
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

// 如果你愿意也可以把这个常量挪到 MapCanvas 里
const BASE_LAYERS: Record<BaseLayerId, { label: string }> = {
  osm: { label: 'OSM' },
  topo: { label: 'Topo' },
  satelite: { label: 'Satelite' },
  dark: { label: 'Dark' },
  light: { label: 'Light' },
  summer: { label: 'Summer' },
  winter: { label: 'Winter' },
  backdrop: { label: 'Backdrop' },
  watercolor: { label: 'Watercolor' },
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
  // 配色方案：从 localStorage 恢复
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

  // 底图：同样带一个持久化
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>(() => {
    const saved = localStorage.getItem('re.baseLayer') as BaseLayerId | null;
    return saved ?? 'dark';
  });

  const handleBaseLayerChange = (id: BaseLayerId) => {
    setBaseLayer(id);
    try {
      localStorage.setItem('re.baseLayer', id);
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

  // summary labels
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

      {/* 顶部控制条：左边是颜色方案，右边是底图 */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>Color:</span>
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
                    ? 'rgba(255,184,107,0.12)'
                    : 'transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontSize: 12,
                }}
              >
                {id}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
          <span style={{ fontSize: 13, opacity: 0.85 }}>Base:</span>
          {(Object.keys(BASE_LAYERS) as BaseLayerId[]).map((k) => {
            const active = k === baseLayer;
            return (
              <button
                key={k}
                onClick={() => handleBaseLayerChange(k)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 999,
                  border: active
                    ? '1px solid #38bdf8'
                    : '1px solid rgba(148,163,184,0.4)',
                  background: active
                    ? 'rgba(56,189,248,0.16)'
                    : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {BASE_LAYERS[k].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 实际地图渲染 */}
      <MapCanvas
        activities={decodedActivities}
        colorScheme={colorScheme}
        baseLayer={baseLayer}
      />
    </div>
  );
}
