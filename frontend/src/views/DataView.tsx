import React from 'react';

export default function DataView({ activities, lines }: { activities:any[]; lines:any[] }){
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
