import { useMemo } from 'react';
import polyline from 'polyline';

export default function DataView({ activities, selectedIds }: { activities:any[]; selectedIds?:number[] }){
  const lines = useMemo(() => {
    const sel = new Set((selectedIds || []));
    const out: any[] = [];
    for (const a of activities || []) {
      if (!a) continue;
      if (sel.size > 0 && !sel.has(a.id)) continue;
      const p = a.polyline;
      if (!p) continue;
      try {
        const coords = polyline.decode(p).map(([lat, lng]: any) => [lat, lng]);
        out.push({ id: a.id, coords });
      } catch (e) {
        continue;
      }
    }
    return out;
  }, [activities, selectedIds]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Data</h2>
      <details style={{ whiteSpace: 'pre-wrap' }}>
        <summary>Activities (JSON)</summary>
        <pre className="json">{JSON.stringify(activities, null, 2)}</pre>
      </details>
      <details style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
        <summary>Lines (JSON)</summary>
        <pre className="json">{JSON.stringify(lines, null, 2)}</pre>
      </details>
    </div>
  );
}
