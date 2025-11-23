import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

type LatLng = [number, number];

interface FitBoundsProps {
  lines: LatLng[][];
  padding?: [number, number];
}

export default function FitBounds({ lines, padding }: FitBoundsProps) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    if (!lines || lines.length === 0) return;
    if (hasFittedRef.current) return;

    const allCoords: LatLng[] = [];
    for (const line of lines) {
      if (!Array.isArray(line)) continue;
      for (const c of line) {
        allCoords.push(c);
      }
    }
    if (allCoords.length === 0) return;

    try {
      map.fitBounds(allCoords as any, {
        padding: padding ?? [40, 40],
        animate: false,
      });
      hasFittedRef.current = true;
    } catch (e) {
      console.error('FitBounds failed', e);
    }
  }, [map, lines, padding]);

  return null;
}
