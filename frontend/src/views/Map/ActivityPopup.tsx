type ActivityLike = {
  id: number;
  name: string;
  type: string;
  date?: string;
};

interface ActivityPopupProps {
  activities: ActivityLike[];
}

export default function ActivityPopup({ activities }: ActivityPopupProps) {
  return (
    <div style={{ minWidth: 220 }}>
      <div
        style={{
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        Activities
      </div>

      {activities.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No activities near this point</div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {activities.map((m) => (
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
                {m.type} · {m.date ? m.date.split('T')[0] : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
