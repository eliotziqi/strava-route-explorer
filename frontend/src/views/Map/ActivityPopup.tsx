export function ActivityPopup({ selectedPoint, activities }: any) {
  if (!selectedPoint) return null;

  return (
    <>
      {activities && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Activities
          </div>
          {activities.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No activities near this point</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {activities.map((m: any) => (
                <li key={m.id} style={{ marginBottom: 6 }}>
                  <a
                    href={`https://www.strava.com/activities/${m.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {m.name || `Activity ${m.id}`}
                  </a>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {m.type} • {m.date?.split("T")[0]}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
