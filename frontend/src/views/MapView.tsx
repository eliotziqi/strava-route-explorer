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

export default function MapView({ activities, selectedIds }: { activities:any[]; selectedIds:number[] }){
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

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Map</h2>
      <AnyMapContainer center={[0, 0] as any} zoom={2} style={{ height: '60vh', width: '100%' }}>
        <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
        {lines.map((coords, idx) => (<Polyline key={idx} positions={coords} pathOptions={{ color: '#ff4c02', weight: 3 }} />))}
        <FitBounds lines={lines} />
      </AnyMapContainer>
    </div>
  );
}
