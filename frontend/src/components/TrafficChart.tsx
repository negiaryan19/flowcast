import type { HistoryPoint } from "../types";

type Props = { points: HistoryPoint[] };

const WIDTH = 720;
const HEIGHT = 220;
const PAD_X = 16;
const PAD_Y = 20;

function makePath(values: number[], min: number, max: number): string {
  const span = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = PAD_X + (index / Math.max(1, values.length - 1)) * (WIDTH - PAD_X * 2);
      const y = PAD_Y + ((max - value) / span) * (HEIGHT - PAD_Y * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TrafficChart({ points }: Props) {
  const actual = points.map((point) => point.actual);
  const predicted = points.map((point) => point.predicted);
  const min = Math.min(...actual, ...predicted);
  const max = Math.max(...actual, ...predicted);
  const latest = points.at(-1);

  return (
    <div className="chart-wrap">
      <div className="chart-heading">
        <div>
          <span className="eyebrow">48 hour replay</span>
          <h2>Observed and predicted traffic</h2>
        </div>
        <div className="legend" aria-label="Chart legend">
          <span><i className="legend-line actual" />Observed</span>
          <span><i className="legend-line predicted" />Predicted</span>
        </div>
      </div>
      <svg className="traffic-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Observed and predicted traffic volume over 48 hours">
        {[0.25, 0.5, 0.75].map((position) => (
          <line key={position} x1={PAD_X} x2={WIDTH - PAD_X} y1={HEIGHT * position} y2={HEIGHT * position} className="grid-line" />
        ))}
        <path d={makePath(actual, min, max)} className="chart-line actual-line" />
        <path d={makePath(predicted, min, max)} className="chart-line predicted-line" />
      </svg>
      <div className="chart-footer">
        <span>{points[0] ? new Date(points[0].timestamp).toLocaleString() : "—"}</span>
        <strong>{latest ? `${latest.actual.toLocaleString()} observed` : "No observations"}</strong>
        <span>{latest ? new Date(latest.timestamp).toLocaleString() : "—"}</span>
      </div>
    </div>
  );
}
