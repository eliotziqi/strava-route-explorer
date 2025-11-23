import { useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMapEvents,
  Popup,
  CircleMarker,
} from 'react-leaflet';
import type { ColorSchemeId } from '../../lib/heatmap';

type LatLng = [number, number];

export interface DecodedActivity {
  id: number;
  name: string;
  type: string;
  date: string;
  points: LatLng[];
}

type MapCanvasProps = {
  activities: DecodedActivity[];
  colorScheme: ColorSchemeId; // 先用来决定一套大致配色
};

// 简单 Haversine 距离（单位：米）
function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const sa = Math.sin(dLat / 2);
  const sb = Math.sin(dLng / 2);

  const c =
    sa * sa +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sb * sb;

  return 2 * R * Math.asin(Math.sqrt(c));
}

// 暴力：点到某条 polyline 的最近距离（扫所有线段端点）
function distancePointToActivity(point: LatLng, act: DecodedActivity): number {
  const pts = act.points;
  if (!pts || pts.length === 0) return Infinity;
  let best = Infinity;

  for (let i = 0; i < pts.length; i++) {
    const d = haversineDistance(point, pts[i]);
    if (d < best) best = d;
  }
  return best;
}

// 简单配色：不同方案给不同主色
function pickColorByScheme(scheme: ColorSchemeId): string {
  switch (scheme) {
    case 'cool':
      return '#37b7c3';
    case 'fire':
      return '#ff4500';
    case 'blue':
      return '#1d7ad5';
    case 'mono':
      return '#ffffff';
    case 'warm':
    default:
      return '#ffb300';
  }
}

function ClickHandler({
  onClickPoint,
}: {
  onClickPoint: (pt: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onClickPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export function MapCanvas({ activities, colorScheme }: MapCanvasProps) {
  console.log('MapCanvas render (stable version)');

  const [selectedPoint, setSelectedPoint] = useState<LatLng | null>(null);
  const [matchedActivities, setMatchedActivities] = useState<DecodedActivity[]>(
    [],
  );

  // 中心点：用第一条活动的第一个点，否则 [0,0]
  const center: LatLng = useMemo(() => {
    const firstAct = activities[0];
    if (firstAct && firstAct.points && firstAct.points.length > 0) {
      return firstAct.points[0];
    }
    return [0, 0];
  }, [activities]);

  const strokeColor = pickColorByScheme(colorScheme);

  const handleMapClick = (pt: LatLng) => {
    setSelectedPoint(pt);

    // 暴力查找：所有活动里，距离点击点 < 50m 的
    const tolerance = 50; // 50 米
    const matched = activities.filter((act) => {
      const d = distancePointToActivity(pt, act);
      return d <= tolerance;
    });

    setMatchedActivities(matched);
  };

  return (
    <MapContainer
      center={center as any}
      zoom={2}
      style={{ height: '60vh', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* 按活动画线（简单版，不做聚合） */}
      {activities.map((a) => (
        <Polyline
          key={a.id}
          positions={a.points as any}
          pathOptions={{
            color: strokeColor,
            weight: 2,
            opacity: 0.8,
          }}
        />
      ))}

      <ClickHandler onClickPoint={handleMapClick} />

      {selectedPoint && (
        <>
          <CircleMarker
            center={selectedPoint as any}
            radius={6}
            pathOptions={{ color: '#fff' }}
          />
          <Popup position={selectedPoint as any}>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Activities
              </div>
              {matchedActivities.length === 0 ? (
                <div style={{ opacity: 0.8 }}>
                  No activities near this point (≤ 50m)
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {matchedActivities.map((m) => (
                    <li key={m.id} style={{ marginBottom: 6 }}>
                      <a
                        href={`https://www.strava.com/activities/${m.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#0077ff' }}
                      >
                        {m.name || `Activity ${m.id}`}
                      </a>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.8,
                        }}
                      >
                        {m.type} • {m.date ? m.date.split('T')[0] : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Popup>
        </>
      )}
    </MapContainer>
  );
}
