import { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents, Popup, CircleMarker } from 'react-leaflet';
import polyline from 'polyline';
import { buildSegmentIndex, queryActivitiesAtPoint, normalizeCount, getColor, COLOR_SCHEMES } from '../lib/heatmap';
import type { ColorSchemeId } from '../lib/heatmap';

const AnyMapContainer: any = MapContainer as any;

function FitBounds({ lines }:{lines:any[]}){
  const map = useMap();
  useEffect(() => {
    if (!map || !lines || lines.length === 0) return;
    try { map.invalidateSize(); } catch (e) { /* ignore */ }
    const allCoords: [number, number][] = [];
    for (const l of lines) {
      if (Array.isArray(l)) {
        for (const c of l) {
          allCoords.push([c[0], c[1]]);
        }
      }
    }
    if (allCoords.length === 0) return;

    // avoid repeatedly calling fitBounds with the same bounds
    try {
      const newBounds = (allCoords as any[]) as [number, number][];
      const bounds = (map as any).getBounds && (map as any).getBounds();
      if (bounds && typeof bounds.isValid === 'function' && bounds.isValid()) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const prev = [ne.lat, ne.lng, sw.lat, sw.lng];
        const nb = newBounds.reduce((acc, p) => {
          acc[0] = Math.max(acc[0], p[0]); // max lat
          acc[1] = Math.max(acc[1], p[1]); // max lng
          acc[2] = Math.min(acc[2], p[0]); // min lat
          acc[3] = Math.min(acc[3], p[1]); // min lng
          return acc;
        }, [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] as number[]);

        // compare roughly with a small epsilon
        const eps = 1e-6;
        const same = Math.abs(prev[0] - nb[0]) < eps && Math.abs(prev[1] - nb[1]) < eps && Math.abs(prev[2] - nb[2]) < eps && Math.abs(prev[3] - nb[3]) < eps;
        if (!same) {
          map.fitBounds(newBounds as any, { padding: [40, 40] });
        }
      } else {
        map.fitBounds(newBounds as any, { padding: [40, 40] });
      }
    } catch (e) {
      // fallback: try to fit bounds normally
      try { map.fitBounds(allCoords as any, { padding: [40, 40] }); } catch (er) { /* ignore */ }
    }
  }, [map, lines]);
  return null;
}

type MapViewProps = {
  activities: any[];
  selectedIds: number[];
  filterSports: string[];
  filterYears: string[];
  filterHasRoute: boolean;
  allSports?: string[];
  allYears?: string[];
};

export default function MapView({ activities, selectedIds, filterSports, filterYears, filterHasRoute, allSports, allYears }: MapViewProps){
  const [colorScheme, setColorScheme] = useState<ColorSchemeId>(() => (localStorage.getItem('re.heatColor') as ColorSchemeId) ?? 'warm');
  const handleColorChange = (id: ColorSchemeId) => { setColorScheme(id); try { localStorage.setItem('re.heatColor', id); } catch {} };

  // decode activities into points for indexing; include only activities that have polylines
  const decodedActivities = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    const sel = new Set(selectedIds || []);
    const out: any[] = [];
    for (const a of activities) {
      if (!a) continue;
      if (sel.size > 0 && !sel.has(a.id)) continue;
      const p = a.polyline;
      if (!p) continue;
      try {
        const coords = polyline.decode(p).map(([lat, lng]: any) => [lat, lng]);
        out.push({ id: a.id, name: a.name, type: a.type, date: a.start_date, points: coords });
      } catch (e) {
        continue;
      }
    }
    return out;
  }, [activities, selectedIds]);

  const segmentIndex = useMemo(() => buildSegmentIndex(decodedActivities as any), [decodedActivities]);

  const counts = (segmentIndex.segments || []).map(s => s.count);
  const minCount = counts.length ? Math.min(...counts) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 1;

  // click handling & popup state
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [matchedActivityIds, setMatchedActivityIds] = useState<number[]>([]);

  function ClickHandler() {
    useMapEvents({
      click(e) {
        const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
        setSelectedPoint(pt);
        const ids = queryActivitiesAtPoint(pt, segmentIndex, 50);
        setMatchedActivityIds(ids);
      }
    });
    return null;
  }

  const matchedActivities = useMemo(() => {
    if (!matchedActivityIds || matchedActivityIds.length === 0) return [];
    const byId = new Map((decodedActivities || []).map((a:any) => [a.id, a]));
    return matchedActivityIds.map((id) => byId.get(id)).filter(Boolean);
  }, [matchedActivityIds, decodedActivities]);

  // render segments as polylines
  const segmentPolylines = useMemo(() => {
    const segs = segmentIndex.segments || [];
    if (segs.length === 0) return [];
    return segs.map((s) => {
      const t = normalizeCount(s.count, minCount, maxCount);
      const color = getColor(t, colorScheme);
      const weight = 1 + t * 3;
      return { key: s.id, positions: [s.a, s.b], color, weight };
    });
  }, [segmentIndex, minCount, maxCount, colorScheme]);

  // memoize bound lines for FitBounds to avoid recreating arrays every render
  const boundLines = useMemo(() => segmentPolylines.map(p => p.positions as any[]), [segmentPolylines]);

  // summary labels (same as StatView)
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

      {/* color scheme selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {Object.keys(COLOR_SCHEMES).map((k) => {
          const id = k as ColorSchemeId;
          const active = id === colorScheme;
          return (
            <button key={id} onClick={() => handleColorChange(id)} style={{ padding: '6px 8px', borderRadius: 8, border: active ? '1px solid #ffb86b' : '1px solid rgba(255,255,255,0.06)', background: active ? 'rgba(255,184,107,0.08)' : 'transparent', cursor: 'pointer' }}>
              {id}
            </button>
          );
        })}
      </div>

      <AnyMapContainer center={[0, 0] as any} zoom={2} style={{ height: '60vh', width: '100%' }}>
        <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
        {segmentPolylines.map((p) => (<Polyline key={p.key} positions={p.positions as any} pathOptions={{ color: p.color, weight: p.weight, opacity: 0.9 }} />))}
        <FitBounds lines={boundLines} />
        <ClickHandler />
        {selectedPoint && (
          <>
            <CircleMarker center={selectedPoint as any} radius={6} pathOptions={{ color: '#fff' }} />
            <Popup position={selectedPoint as any}>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Activities</div>
                {matchedActivities.length === 0 ? (
                  <div style={{ opacity: 0.8 }}>No activities near this point</div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {matchedActivities.map((m:any) => (
                      <li key={m.id} style={{ marginBottom: 6 }}>
                        <a href={`https://www.strava.com/activities/${m.id}`} target="_blank" rel="noreferrer" style={{ color: '#0077ff' }}>
                          {m.name || `Activity ${m.id}`}
                        </a>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{m.type} • {m.date ? m.date.split('T')[0] : ''}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Popup>
          </>
        )}
      </AnyMapContainer>
    </div>
  );
}
