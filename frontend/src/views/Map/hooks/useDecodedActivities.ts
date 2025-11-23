import { useMemo } from "react";
import polyline from "polyline";

export function useDecodedActivities(activities: any[], selectedIds: number[]) {
  return useMemo(() => {
    if (!activities || activities.length === 0) return [];

    const sel = new Set(selectedIds || []);
    const out: any[] = [];

    for (const a of activities) {
      if (!a) continue;
      if (sel.size > 0 && !sel.has(a.id)) continue;
      if (!a.polyline) continue;

      try {
        const coords = polyline
          .decode(a.polyline)
          .map(([lat, lng]: any) => [lat, lng]);
        out.push({
          id: a.id,
          name: a.name,
          type: a.type,
          date: a.start_date,
          points: coords,
        });
      } catch {}
    }

    return out;
  }, [activities, selectedIds]);
}
