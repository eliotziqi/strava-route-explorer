import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

export function FitBounds({ lines }: { lines: any[] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!map || !lines || lines.length === 0) return;
    if (hasFittedRef.current) return;

    const allCoords: [number, number][] = [];

    for (const l of lines) {
      if (Array.isArray(l)) {
        for (const c of l) {
          allCoords.push([c[0], c[1]]);
        }
      }
    }

    if (allCoords.length === 0) return;

    try {
      map.invalidateSize();
      map.fitBounds(allCoords as any, {
        padding: [40, 40],
        animate: false,
      });
      hasFittedRef.current = true;
    } catch (e) {
      console.error("FitBounds failed", e);
    }
  }, [map, lines]);

  return null;
}
