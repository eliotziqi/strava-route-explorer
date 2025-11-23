import { COLOR_SCHEMES } from "../../lib/heatmap";
import type { ColorSchemeId } from "../../lib/heatmap";

export function ColorSchemeSelector({
  colorScheme,
  onChange
}: {
  colorScheme: ColorSchemeId;
  onChange: (id: ColorSchemeId) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      {Object.keys(COLOR_SCHEMES).map((k) => {
        const id = k as ColorSchemeId;
        const active = id === colorScheme;

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: active
                ? "1px solid #ffb86b"
                : "1px solid rgba(255,255,255,0.06)",
              background: active
                ? "rgba(255,184,107,0.08)"
                : "transparent",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}
