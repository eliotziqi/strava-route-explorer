import { useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMapEvents,
  Popup,
  CircleMarker,
} from 'react-leaflet';
import {
  buildSegmentIndex,
  normalizeCount,
  getColor,
} from '../../lib/heatmap';
import type { ColorSchemeId } from '../../lib/heatmap';
import ActivityPopup from './ActivityPopup';
import FitBounds from './FitBounds';

type LatLng = [number, number];

export interface DecodedActivity {
  id: number;
  name: string;
  type: string;
  date: string;
  points: LatLng[];
}

type SegmentPolyline = {
  key: string;
  positions: LatLng[];
  color: string;
  weight: number;
};

type MapCanvasProps = {
  activities: DecodedActivity[];
  colorScheme: ColorSchemeId;
};

/* ------------------ 距离 / 命中工具 ------------------ */

// 把经纬度投影到近似平面坐标（米）
function projectToXYMeters([lat, lng]: LatLng, lat0: number): [number, number] {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const x = R * toRad(lng) * Math.cos(toRad(lat0));
  const y = R * toRad(lat);
  return [x, y];
}

// 点到线段的距离（单位：米）
function pointToSegmentDistanceMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const lat0 = p[0];
  const [px, py] = projectToXYMeters(p, lat0);
  const [ax, ay] = projectToXYMeters(a, lat0);
  const [bx, by] = projectToXYMeters(b, lat0);

  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;

  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) {
    const dx = px - ax;
    const dy = py - ay;
    return Math.hypot(dx, dy);
  }
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) {
    const dx = px - bx;
    const dy = py - by;
    return Math.hypot(dx, dy);
  }

  const t = c1 / c2;
  const projX = ax + t * vx;
  const projY = ay + t * vy;

  const dx = px - projX;
  const dy = py - projY;
  return Math.hypot(dx, dy);
}

// 点击点到活动 polyline 的最近距离（遍历所有线段）
function distancePointToActivity(pt: LatLng, act: DecodedActivity): number {
  const pts = act.points;
  if (!pts || pts.length < 2) return Infinity;

  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pointToSegmentDistanceMeters(pt, pts[i], pts[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

// zoom 自适应容差（单位：米）
function toleranceForZoom(zoom: number): number {
  const base = 40;
  const scale = Math.pow(2, 12 - zoom);
  const raw = base * scale;
  return Math.max(30, Math.min(raw, 400));
}

/* ------------------ 地图点击组件 ------------------ */

function ClickHandler({
  onClickPoint,
}: {
  onClickPoint: (pt: LatLng, zoom: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onClickPoint([e.latlng.lat, e.latlng.lng], map.getZoom());
    },
  });
  return null;
}

/* ------------------ 主组件 ------------------ */

export function MapCanvas({ activities, colorScheme }: MapCanvasProps) {
  console.log('MapCanvas render (full heatmap)');

  const [selectedPoint, setSelectedPoint] = useState<LatLng | null>(null);
  const [matchedActivities, setMatchedActivities] = useState<DecodedActivity[]>(
    [],
  );

  /* ---------- 构建热力索引（带下采样） ---------- */
  const segmentIndex = useMemo(
    () => buildSegmentIndex(activities as any, 0.02, 500),
    [activities],
  );

  const segCount = segmentIndex.segments?.length ?? 0;
  const useFallback = segCount > 50000; // 太多就降级成每活动一条线

  /* ---------- 安全 min / max ---------- */
  const counts = (segmentIndex.segments || []).map((s: any) => s.count);

  const minCount = counts.length
    ? counts.reduce((a, b) => (a < b ? a : b), Infinity)
    : 0;

  const maxCount = counts.length
    ? counts.reduce((a, b) => (a > b ? a : b), -Infinity)
    : 1;

  /* ---------- 热力 polyline 数据 ---------- */
  const segmentPolylines: SegmentPolyline[] = useMemo(() => {
    const segs = segmentIndex.segments || [];
    if (segs.length === 0) return [];

    return segs.map((s: any) => {
      const t = normalizeCount(s.count, minCount, maxCount);
      const color = getColor(t, colorScheme);
      const weight = 1 + t * 3;
      return {
        key: s.id,
        positions: [s.a, s.b],
        color,
        weight,
      };
    });
  }, [segmentIndex, minCount, maxCount, colorScheme]);

  /* ---------- 地图初始中心 ---------- */
  const center: LatLng = useMemo(() => {
    const firstAct = activities[0];
    if (firstAct && firstAct.points && firstAct.points.length > 0) {
      return firstAct.points[0];
    }
    return [0, 0];
  }, [activities]);

  /* ---------- 点击逻辑 ---------- */
  const handleMapClick = (pt: LatLng, zoom: number) => {
    setSelectedPoint(pt);

    const tolerance = toleranceForZoom(zoom);
    console.log('click at', pt, 'zoom', zoom, 'tolerance(m)', tolerance);

    const nearby = activities.filter((act) => {
      const d = distancePointToActivity(pt, act);
      return d <= tolerance;
    });

    setMatchedActivities(nearby);
  };

  /* ---------- FitBounds 用的 lines ---------- */
  const boundLines: LatLng[][] = useMemo(() => {
    if (useFallback) {
      return activities.map((a) => a.points);
    }
    return segmentPolylines.map((p) => p.positions);
  }, [useFallback, activities, segmentPolylines]);

  /* ---------- 渲染 ---------- */
  return (
    <MapContainer
      center={center as any}
      zoom={2}
      style={{ height: '60vh', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* 热力线 / Fallback 线路 */}
      {useFallback
        ? activities.map((a) => (
            <Polyline
              key={a.id}
              positions={a.points as any}
              pathOptions={{
                color: '#ffb300',
                weight: 2,
                opacity: 0.8,
              }}
            />
          ))
        : segmentPolylines.map((p) => (
            <Polyline
              key={p.key}
              positions={p.positions as any}
              pathOptions={{
                color: p.color,
                weight: p.weight,
                opacity: 0.9,
              }}
            />
          ))}

      {/* 自动缩放（如果你暂时不想自动 fit，可以先注释掉这一行） */}
      <FitBounds lines={boundLines} />

      {/* 点击处理 */}
      <ClickHandler onClickPoint={handleMapClick} />

      {/* 点击点 + 弹出活动列表 */}
      {selectedPoint && (
        <>
          <CircleMarker
            center={selectedPoint as any}
            radius={6}
            pathOptions={{ color: '#ffffff' }}
          />
          <Popup position={selectedPoint as any}>
            <ActivityPopup activities={matchedActivities} />
          </Popup>
        </>
      )}
    </MapContainer>
  );
}
