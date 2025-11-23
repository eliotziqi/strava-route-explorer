import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';

const AnyMapContainer: any = MapContainer as any;

function FitBounds({ lines }:{lines:any[]}){
  const map = useMap();
  useEffect(() => {
    if (!map || !lines || lines.length === 0) return;
    try { map.invalidateSize(); } catch (e) { /* ignore */ }
    const allCoords: [number, number][] = [];
    for (const l of lines) {
      if (Array.isArray(l.coords)) {
        for (const c of l.coords) {
          allCoords.push([c[0], c[1]]);
        }
      }
    }
    if (allCoords.length === 0) return;
    map.fitBounds(allCoords as any, { padding: [40, 40] });
  }, [map, lines]);
  return null;
}

export default function MapView({ lines, loadingLines }: { lines:any[]; loadingLines:boolean }){
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Map</h2>
      <AnyMapContainer center={[0, 0] as any} zoom={2} style={{ height: '60vh', width: '100%' }}>
        <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
        {loadingLines && (<div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, background: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 6 }}>Loading lines...</div>)}
        {lines.map((l) => (<Polyline key={l.id} positions={l.coords} pathOptions={{ color: '#ff4c02', weight: 3 }} />))}
        <FitBounds lines={lines} />
      </AnyMapContainer>
    </div>
  );
}
