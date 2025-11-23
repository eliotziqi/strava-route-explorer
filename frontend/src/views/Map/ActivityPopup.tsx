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
  // 根据数量决定列数
  let columnCount = 1;
  if (activities.length > 25) {
    columnCount = 3;
  } else if (activities.length > 10) {
    columnCount = 2;
  }

  // 根据列数动态控制宽度
  const popupWidth =
    columnCount === 1 ? 280 :
    columnCount === 2 ? 420 :
    600;

  return (
    <div
      style={{
        width: popupWidth,
        maxHeight: 400,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        Activities ({activities.length})
      </div>

      {activities.length === 0 ? (
        <div style={{ opacity: 0.8 }}>No activities near this point</div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            columnGap: 16,
            rowGap: 8,
          }}
        >
          {activities.map((m) => (
            <li
              key={m.id}
              style={{
                breakInside: 'avoid',
                paddingRight: 8,
              }}
            >
              <a
                href={`https://www.strava.com/activities/${m.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#0077ff', fontWeight: 500 }}
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
