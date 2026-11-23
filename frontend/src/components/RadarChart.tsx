type Axis = { label: string; value: number };

/** A small dependency-free radar/pentagon chart, drawn from N axis values (0-100).
 *  Everything — grid, data polygon and labels — lives inside one SVG viewBox,
 *  so the whole chart scales fluidly with its container instead of being a
 *  fixed pixel size. */
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
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        ))}
        {axes.map((_, i) => {
          const p = pointAt(i, 1);
          return (
            <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
          );
        })}
        <polygon points={dataPath} fill="rgba(162,89,255,0.35)" stroke="#a259ff" strokeWidth={2} />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#c7a3ff" />
        ))}
        {axes.map((a, i) => {
          const p = pointAt(i, 1.26);
          const anchor = p.x < center - 10 ? 'end' : p.x > center + 10 ? 'start' : 'middle';
          return (
            <text key={a.label} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle">
              <tspan x={p.x} dy="-0.3em" className="fill-white text-[13px] font-bold">
                {a.label}
              </tspan>
              <tspan x={p.x} dy="1.3em" className="fill-purple-400 text-[11px] font-bold">
                {a.value}%
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
