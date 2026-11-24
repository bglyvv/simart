type Axis = { label: string; value: number };

/** A small dependency-free radar/pentagon chart, drawn from N axis values (0-100).
 *  Everything — grid, data polygon and labels — lives inside one SVG viewBox,
 *  so the whole chart scales fluidly with its container instead of being a
 *  fixed pixel size.
 *
 *  Premium redesign: neutral grid, sage data highlight — DESIGN_SYSTEM.md §6
 *  ("neutral bars, sage highlights, minimal grid lines"). Assumes a light
 *  card background (restyled alongside its one consumer, ParentDashboardPage,
 *  in the same phase — see root CLAUDE.md's Phase 1 note on why this was
 *  deferred rather than done with the other shared primitives). */
export default function RadarChart({ axes, size = 320 }: { axes: Axis[]; size?: number }) {
  const n = axes.length;
  const center = size / 2;
  const radius = size / 2 - 54;

  const pointAt = (index: number, fraction: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * fraction,
      y: center + Math.sin(angle) * radius * fraction,
    };
  };

  const dataPoints = axes.map((a, i) => pointAt(i, a.value / 100));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="mx-auto w-full" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full">
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={axes.map((_, i) => pointAt(i, level)).map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            className="stroke-border"
            strokeWidth={1}
          />
        ))}
        {axes.map((_, i) => {
          const p = pointAt(i, 1);
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} className="stroke-border" strokeWidth={1} />;
        })}
        {/* rgba mirrors --color-sage (#a7b8a0) at 35% — SVG fill can't read a
            CSS custom property's components for alpha blending directly. */}
        <polygon points={dataPath} fill="rgba(167,184,160,0.35)" className="stroke-sage" strokeWidth={2} />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-sage" />
        ))}
        {axes.map((a, i) => {
          const p = pointAt(i, 1.26);
          const anchor = p.x < center - 10 ? 'end' : p.x > center + 10 ? 'start' : 'middle';
          return (
            <text key={a.label} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle">
              <tspan x={p.x} dy="-0.3em" className="fill-text-900 text-[13px] font-bold">
                {a.label}
              </tspan>
              <tspan x={p.x} dy="1.3em" className="fill-text-500 text-[11px] font-bold">
                {a.value}%
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
