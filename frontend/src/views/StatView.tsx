import { useMemo } from "react";

type Activity = {
  id: number;
  type: string;
  distance?: number;      // meters
  moving_time?: number;   // seconds
  start_date?: string;
  name?: string;
  start_latlng?: [number, number];
};

export default function StatView({
  activities,
  selectedIds,
}: {
  activities: Activity[];
  selectedIds?: number[];
}) {

  const stats = useMemo(() => {
    const sel = new Set(selectedIds || []);

    // 只统计被选中的，如果你想全统计，把这行改掉
    const acts = (activities || []).filter(a =>
      sel.size === 0 ? true : sel.has(a.id)
    );

    const totalDistance = acts.reduce((s, a) => s + (a.distance || 0), 0);
    const totalMovingTime = acts.reduce((s, a) => s + (a.moving_time || 0), 0);

    const longest = [...acts].sort((a, b) =>
      (b.distance || 0) - (a.distance || 0)
    )[0];

    const nowYear = new Date().getFullYear();
    const yearDistance = acts
      .filter(a => a.start_date && new Date(a.start_date).getFullYear() === nowYear)
      .reduce((s, a) => s + (a.distance || 0), 0);

    // 统计运动类型
    const typeCount: Record<string, number> = {};
    for (const a of acts) {
      const t = a.type || "Unknown";
      typeCount[t] = (typeCount[t] || 0) + 1;
    }

    const primarySport = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      count: acts.length,
      totalDistanceKm: (totalDistance / 1000).toFixed(1),
      totalHours: (totalMovingTime / 3600).toFixed(1),
      longestName: longest?.name,
      longestKm: longest?.distance ? (longest.distance / 1000).toFixed(1) : "-",
      yearDistanceKm: (yearDistance / 1000).toFixed(1),
      primarySport,
    };
  }, [activities, selectedIds]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Stats</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginTop: 12,
        }}
      >
        <StatCard label="Activities" value={stats.count} />
        <StatCard label="Total Distance" value={`${stats.totalDistanceKm} km`} />
        <StatCard label="Total Time" value={`${stats.totalHours} h`} />
        <StatCard label="This Year" value={`${stats.yearDistanceKm} km`} />
        <StatCard label="Longest" value={`${stats.longestKm} km`} />
        <StatCard label="Primary Sport" value={stats.primarySport || "-"} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}
