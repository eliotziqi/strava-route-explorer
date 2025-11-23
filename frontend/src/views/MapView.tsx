import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import polyline from 'polyline';

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
    map.fitBounds(allCoords as any, { padding: [40, 40] });
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
  // decode selected polylines from activities (client-side) to avoid extra backend calls
  const lines = useMemo(() => {
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
        out.push(coords);
      } catch (e) {
        continue;
      }
    }
    return out;
  }, [activities, selectedIds]);

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
      <AnyMapContainer center={[0, 0] as any} zoom={2} style={{ height: '60vh', width: '100%' }}>
        <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
        {lines.map((coords, idx) => (<Polyline key={idx} positions={coords} pathOptions={{ color: '#ff4c02', weight: 3 }} />))}
        <FitBounds lines={lines} />
      </AnyMapContainer>
    </div>
  );
}
