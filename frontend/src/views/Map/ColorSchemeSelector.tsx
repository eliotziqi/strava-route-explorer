import { COLOR_SCHEMES } from '../../lib/heatmap';
import type { ColorSchemeId } from '../../lib/heatmap';

interface ColorSchemeSelectorProps {
  value: ColorSchemeId;
  onChange: (scheme: ColorSchemeId) => void;
}

export default function ColorSchemeSelector({
  value,
  onChange,
}: ColorSchemeSelectorProps) {
  const schemes = Object.keys(COLOR_SCHEMES) as ColorSchemeId[];

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      {schemes.map((id) => {
        const active = id === value;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              border: active
                ? '1px solid #ffb86b'
                : '1px solid rgba(255,255,255,0.06)',
              background: active
                ? 'rgba(255,184,107,0.08)'
                : 'transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontSize: 13,
            }}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}
