// Heatmap / segment index helpers for Phase 1
// Provides: buildSegmentIndex, queryActivitiesAtPoint, normalize, color scheme helpers

export type LatLng = [number, number];
export type ActivityType = "run" | "ride" | "hike" | "other";

export interface Activity {
  id: number;
  name?: string;
  type?: ActivityType | string;
  date?: string;
  points: LatLng[]; // decoded polyline points
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
}

// Quantize a point to a string key with given precision (decimal places)
function quantizePoint(p: LatLng, prec = 5) {
  return `${p[0].toFixed(prec)}|${p[1].toFixed(prec)}`;
}

function segmentKey(a: LatLng, b: LatLng, prec = 5) {
  // produce an order-invariant key for a segment
  const aStr = quantizePoint(a, prec);
  const bStr = quantizePoint(b, prec);
  return aStr < bStr ? `${aStr}/${bStr}` : `${bStr}/${aStr}`;
}

// Simple cell mapping: map lat/lng into integer grid cell based on degrees
function cellKeyForPoint(p: LatLng, cellSizeDegrees = 0.01) {
  const x = Math.floor(p[0] / cellSizeDegrees);
  const y = Math.floor(p[1] / cellSizeDegrees);
  return `${x},${y}`;
}

export function buildSegmentIndex(activities: Activity[], opts?: { precision?: number; cellSizeDegrees?: number; }) : SegmentIndex {
  const precision = opts?.precision ?? 5;
  const cellSizeDegrees = opts?.cellSizeDegrees ?? 0.01;

  const map = new Map<string, Segment>();

  for (const act of activities || []) {
    if (!act || !Array.isArray(act.points) || act.points.length < 2) continue;
    const pts = act.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i+1];
      const key = segmentKey(a, b, precision);
      let seg = map.get(key);
      if (!seg) {
        seg = { id: key, a, b, count: 0, activityIds: [] };
        map.set(key, seg);
      }
      seg.count += 1;
      if (!seg.activityIds.includes(act.id)) seg.activityIds.push(act.id);
    }
  }

  const segments = Array.from(map.values());
  const grid: Record<string, number[]> = {};

  segments.forEach((s, idx) => {
    const mid: LatLng = [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2];
    const ck = cellKeyForPoint(mid, cellSizeDegrees);
    if (!grid[ck]) grid[ck] = [];
    grid[ck].push(idx);
  });

  return { segments, grid };
}

// Haversine distance (meters)
function toRad(n: number) { return n * Math.PI / 180; }
function haversine(a: LatLng, b: LatLng) {
  const R = 6371000; // meters
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const sinDlat = Math.sin(dLat/2);
  const sinDlon = Math.sin(dLon/2);
  const x = sinDlat*sinDlat + Math.cos(lat1)*Math.cos(lat2)*sinDlon*sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  return R * c;
}

// distance from point p to segment ab in meters (approx using haversine)
function pointToSegmentDistanceMeters(p: LatLng, a: LatLng, b: LatLng) {
  // Handle degenerate case
  const abDist = haversine(a, b);
  if (abDist === 0) return haversine(p, a);

  // Project p onto line ab using simple equirectangular approx for small distances
  // Convert to Cartesian using lat/lon in radians scaled by cos(meanLat)
  const latMean = toRad((a[0] + b[0] + p[0]) / 3);
  const xA = toRad(a[1]) * Math.cos(latMean);
  const yA = toRad(a[0]);
  const xB = toRad(b[1]) * Math.cos(latMean);
  const yB = toRad(b[0]);
  const xP = toRad(p[1]) * Math.cos(latMean);
  const yP = toRad(p[0]);

  const vx = xB - xA;
  const vy = yB - yA;
  const wx = xP - xA;
  const wy = yP - yA;
  const c1 = vx*wx + vy*wy;
  const c2 = vx*vx + vy*vy;
  let t = c1 / c2;
  t = Math.max(0, Math.min(1, t));
  const projX = xA + t*vx;
  const projY = yA + t*vy;

  // distance between P and projection in meters
  const dRad = Math.sqrt((projY - yP)*(projY - yP) + (projX - xP)*(projX - xP));
  return dRad * 6371000; // approximate
}

export function queryActivitiesAtPoint(point: LatLng, index: SegmentIndex, toleranceMeters = 50, opts?: { cellSizeDegrees?: number; searchRadius?: number }) : number[] {
  const cellSizeDegrees = opts?.cellSizeDegrees ?? 0.01;
  const searchRadius = opts?.searchRadius ?? 1; // number of cells around
  const ck = cellKeyForPoint(point, cellSizeDegrees);
  const [cxStr, cyStr] = ck.split(',');
  const cx = Number(cxStr);
  const cy = Number(cyStr);

  const hitActivityIds = new Set<number>();

  for (let dx = -searchRadius; dx <= searchRadius; dx++) {
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      const key = `${cx+dx},${cy+dy}`;
      const candidates = index.grid[key];
      if (!candidates || candidates.length === 0) continue;
      for (const si of candidates) {
        const s = index.segments[si];
        const d = pointToSegmentDistanceMeters(point, s.a, s.b);
        if (d <= toleranceMeters) {
          for (const aid of s.activityIds) hitActivityIds.add(aid);
        }
      }
    }
  }

  return Array.from(hitActivityIds);
}

// normalize count to 0..1
export function normalizeCount(count: number, min: number, max: number) {
  if (max === min) return 1;
  return (count - min) / (max - min);
}

// Simple color interpolation helpers
function hexToRgb(hex: string) {
  const h = hex.replace('#','');
  const bigint = parseInt(h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

export type ColorStop = { stop: number; color: string };
export type ColorSchemeId = 'warm' | 'cool' | 'fire' | 'blue' | 'mono';

export const COLOR_SCHEMES: Record<ColorSchemeId, ColorStop[]> = {
  warm: [ { stop: 0, color: '#ffffff' }, { stop: 0.5, color: '#ffb86b' }, { stop: 1, color: '#ff4c02' } ],
  cool: [ { stop: 0, color: '#ffffff' }, { stop: 0.5, color: '#9be7ff' }, { stop: 1, color: '#0077ff' } ],
  fire: [ { stop: 0, color: '#ffffe0' }, { stop: 0.5, color: '#ffbf40' }, { stop: 1, color: '#ff0000' } ],
  blue: [ { stop: 0, color: '#f0f8ff' }, { stop: 0.5, color: '#a0c4ff' }, { stop: 1, color: '#0047ab' } ],
  mono: [ { stop: 0, color: '#f7f7f7' }, { stop: 1, color: '#333333' } ],
};

export function getColor(t: number, schemeId: ColorSchemeId) {
  const scheme = COLOR_SCHEMES[schemeId] || COLOR_SCHEMES.warm;
  if (t <= scheme[0].stop) return scheme[0].color;
  for (let i = 0; i < scheme.length - 1; i++) {
    const a = scheme[i];
    const b = scheme[i+1];
    if (t >= a.stop && t <= b.stop) {
      const span = (t - a.stop) / (b.stop - a.stop || 1);
      const [ar, ag, ab] = hexToRgb(a.color);
      const [br, bg, bb] = hexToRgb(b.color);
      const rr = Math.round(ar + (br - ar) * span);
      const rg = Math.round(ag + (bg - ag) * span);
      const rb = Math.round(ab + (bb - ab) * span);
      return rgbToHex(rr, rg, rb);
    }
  }
  return scheme[scheme.length-1].color;
}
