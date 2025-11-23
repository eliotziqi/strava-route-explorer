// src/lib/heatmap.ts
export type LatLng = [number, number];

export type ColorSchemeId = 'warm' | 'cool' | 'fire' | 'blue' | 'mono';

export interface DecodedActivity {
  id: number;
  name: string;
  type: string;
  date: string;
  points: LatLng[];
}

interface SegmentMutable {
  id: string;
  a: LatLng;
  b: LatLng;
  count: number;
  activityIds: number[];
}

export interface Segment {
  id: string;
  a: LatLng;
  b: LatLng;
  count: number;
  activityIds: number[];
}

export interface SegmentIndex {
  segments: Segment[];
  grid: Record<string, number[]>; // cellKey -> segment indices
  cellSizeDegrees: number;
}

// 粗糙量化函数，避免浮点误差导致同一线段被拆成很多段
function quantizeCoord([lat, lng]: LatLng, precision = 5): LatLng {
  const f = Math.pow(10, precision);
  return [Math.round(lat * f) / f, Math.round(lng * f) / f];
}

function segmentKey(a: LatLng, b: LatLng): string {
  const qa = quantizeCoord(a);
  const qb = quantizeCoord(b);
  const key1 = `${qa[0]},${qa[1]}_${qb[0]},${qb[1]}`;
  const key2 = `${qb[0]},${qb[1]}_${qa[0]},${qa[1]}`;
  return key1 < key2 ? key1 : key2; // 无向：排序
}

export function buildSegmentIndex(
  activities: DecodedActivity[],
  cellSizeDegrees = 0.02,
  maxPointsPerActivity = 500,   // 新增：每条活动最多参与多少点
): SegmentIndex {
  const segMap = new Map<string, SegmentMutable>();

  for (const act of activities) {
    const pts = act.points;
    if (!pts || pts.length < 2) continue;

    // ✅ 下采样：一条路线太长就抽稀，比如最多 500 点
    const decimated: LatLng[] = [];
    const step = Math.max(1, Math.floor(pts.length / maxPointsPerActivity));
    for (let i = 0; i < pts.length; i += step) {
      decimated.push(pts[i]);
    }
    if (decimated.length < 2) continue;

    // 用抽稀后的点生成线段
    for (let i = 0; i < decimated.length - 1; i++) {
      const a = decimated[i];
      const b = decimated[i + 1];
      const key = segmentKey(a, b);

      let seg = segMap.get(key);
      if (!seg) {
        seg = {
          id: key,
          a,
          b,
          count: 0,
          activityIds: [],
        };
        segMap.set(key, seg);
      }
      seg.count += 1;
      if (!seg.activityIds.includes(act.id)) {
        seg.activityIds.push(act.id);
      }
    }
  }

  const segments: Segment[] = Array.from(segMap.values()).map((s) => ({
    id: s.id,
    a: s.a,
    b: s.b,
    count: s.count,
    activityIds: s.activityIds,
  }));

  // 2. 粗网格索引同原来
  const grid: Record<string, number[]> = {};

  function cellKeyForLatLng([lat, lng]: LatLng): string {
    const cx = Math.floor(lng / cellSizeDegrees);
    const cy = Math.floor(lat / cellSizeDegrees);
    return `${cx},${cy}`;
  }

  segments.forEach((seg, idx) => {
    const mid: LatLng = [
      (seg.a[0] + seg.b[0]) / 2,
      (seg.a[1] + seg.b[1]) / 2,
    ];
    const ck = cellKeyForLatLng(mid);
    if (!grid[ck]) grid[ck] = [];
    grid[ck].push(idx);
  });

  return { segments, grid, cellSizeDegrees };
}

// 计数归一化
export function normalizeCount(
  count: number,
  minCount: number,
  maxCount: number,
): number {
  if (maxCount === minCount) return 1;
  return (count - minCount) / (maxCount - minCount);
}

// 颜色方案
type ColorStop = { stop: number; color: string };

export const COLOR_SCHEMES: Record<ColorSchemeId, ColorStop[]> = {
  warm: [
    { stop: 0.0, color: '#1a1b26' },
    { stop: 0.3, color: '#ff7b00' },
    { stop: 0.6, color: '#ffb300' },
    { stop: 1.0, color: '#ffffff' },
  ],
  cool: [
    { stop: 0.0, color: '#071952' },
    { stop: 0.3, color: '#0b6683' },
    { stop: 0.6, color: '#37b7c3' },
    { stop: 1.0, color: '#e0ffff' },
  ],
  fire: [
    { stop: 0.0, color: '#200000' },
    { stop: 0.3, color: '#8b0000' },
    { stop: 0.6, color: '#ff4500' },
    { stop: 0.8, color: '#ffb000' },
    { stop: 1.0, color: '#ffffe0' },
  ],
  blue: [
    { stop: 0.0, color: '#001d3d' },
    { stop: 0.3, color: '#003566' },
    { stop: 0.6, color: '#1d7ad5' },
    { stop: 1.0, color: '#90e0ef' },
  ],
  mono: [
    { stop: 0.0, color: '#111111' },
    { stop: 0.4, color: '#555555' },
    { stop: 0.7, color: '#aaaaaa' },
    { stop: 1.0, color: '#ffffff' },
  ],
};

// 极简颜色选择（可以以后再做真正插值）
export function getColor(t: number, schemeId: ColorSchemeId): string {
  const stops = COLOR_SCHEMES[schemeId] || COLOR_SCHEMES.warm;
  if (t <= 0) return stops[0].color;
  if (t >= 1) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.stop && t <= b.stop) {
      const r = (t - a.stop) / (b.stop - a.stop || 1);
      return r < 0.5 ? a.color : b.color;
    }
  }
  return stops[stops.length - 1].color;
}

// 距离函数
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

function pointToSegmentDistance(p: LatLng, a: LatLng, b: LatLng): number {
  // 简化版：点到两端点的最小距离
  const d1 = haversineDistance(p, a);
  const d2 = haversineDistance(p, b);
  return Math.min(d1, d2);
}

// 点选查询
export function queryActivitiesAtPoint(
  point: LatLng,
  index: SegmentIndex,
  toleranceMeters = 50,
): number[] {
  const { segments, grid, cellSizeDegrees } = index;
  if (!segments.length) return [];

  const cx = Math.floor(point[1] / cellSizeDegrees);
  const cy = Math.floor(point[0] / cellSizeDegrees);

  const candidates: number[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cx + dx},${cy + dy}`;
      const arr = grid[key];
      if (!arr) continue;
      for (const idx of arr) {
        candidates.push(idx);
      }
    }
  }

  if (!candidates.length) return [];

  const resultActivityIds = new Set<number>();

  for (const idx of candidates) {
    const seg = segments[idx];
    const dist = pointToSegmentDistance(point, seg.a, seg.b);
    if (dist <= toleranceMeters) {
      for (const aid of seg.activityIds) {
        resultActivityIds.add(aid);
      }
    }
  }

  return Array.from(resultActivityIds);
}
