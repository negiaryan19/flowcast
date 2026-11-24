import { useId, useState } from "react";
import type { HistoryPoint } from "../types";
import { number, sourceTime } from "../lib/format";
type Props = {
  points: HistoryPoint[];
  selected?: number;
  onSelect?: (i: number) => void;
  compact?: boolean;
};
export function TrafficChart({
  points,
  selected,
  onSelect,
  compact = false,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId().replaceAll(":", "");
  if (!points.length)
    return (
      <div className="empty-chart">No observations in this selection.</div>
    );
  const w = 900,
    h = compact ? 180 : 245,
    left = 52,
    right = 18,
    top = 20,
    bottom = 36;
  const max = Math.max(
    1000,
    Math.ceil(
      Math.max(...points.flatMap((p) => [p.actual, p.predicted])) / 1000,
    ) * 1000,
  );
  const stamps = points.map((p) => Date.parse(p.timestamp + "Z")),
    start = stamps[0],
    span = Math.max(1, stamps.at(-1)! - start);
  const x = (i: number) =>
      left + ((stamps[i] - start) / span) * (w - left - right),
    y = (v: number) => top + (1 - v / max) * (h - top - bottom);
  const path = (key: "actual" | "predicted") =>
    points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[key])}`).join(" ");
  const focus = Math.max(
      0,
      Math.min(points.length - 1, hover ?? selected ?? points.length - 1),
    ),
    point = points[focus] ?? points.at(-1)!;
  return (
    <div className="chart-component">
      <div className="chart-readout">
        <span>
          <i className="legend-dot actual" />
          Observed <strong>{number(point.actual)}</strong>
        </span>
        <span>
          <i className="legend-dot predicted" />
          Forecast <strong>{number(point.predicted)}</strong>
        </span>
        <small>{sourceTime(point.timestamp, true)} · source local</small>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="traffic-chart"
        role="img"
        tabIndex={onSelect ? 0 : undefined}
        aria-label="Hourly traffic volume, observed versus forecast. Use left and right arrow keys to select observations. Values are also available in forecast history."
        onKeyDown={(event) => {
          if (!onSelect || !["ArrowLeft", "ArrowRight"].includes(event.key))
            return;
          event.preventDefault();
          setHover(null);
          onSelect(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                (selected ?? points.length - 1) +
                  (event.key === "ArrowRight" ? 1 : -1),
              ),
            ),
          );
        }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#a5c644" stopOpacity=".22" />
            <stop offset="1" stopColor="#a5c644" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={left}
              x2={w - right}
              y1={y(max * f)}
              y2={y(max * f)}
              className="chart-grid"
            />
            <text x={left - 12} y={y(max * f) + 4} textAnchor="end">
              {number((max * f) / 1000, 1)}k
            </text>
          </g>
        ))}
        <path
          d={`${path("actual")} L${x(points.length - 1)},${h - bottom} L${left},${h - bottom} Z`}
          fill={`url(#${id})`}
        />
        <path d={path("actual")} className="actual-line" />
        <path d={path("predicted")} className="forecast-line" />
        <line
          x1={x(focus)}
          x2={x(focus)}
          y1={top}
          y2={h - bottom}
          className="cursor-line"
        />
        <circle
          cx={x(focus)}
          cy={y(point.actual)}
          r="5"
          fill="#506e20"
          stroke="white"
          strokeWidth="2"
        />
        {Array.from(
          new Set([
            0,
            Math.floor((points.length - 1) / 4),
            Math.floor((points.length - 1) / 2),
            Math.floor((points.length - 1) * 0.75),
            points.length - 1,
          ]),
        ).map((i) => (
          <text
            key={i}
            x={x(i)}
            y={h - 8}
            textAnchor={
              i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
            }
          >
            {sourceTime(points[i].timestamp)}
          </text>
        ))}
        {points.map((p, i) => (
          <rect
            key={p.timestamp}
            x={Math.max(left, x(i) - (w - left - right) / points.length / 2)}
            y={top}
            width={(w - left - right) / points.length}
            height={h - top - bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(i)}
          >
            <title>
              {sourceTime(p.timestamp, true)}: observed {p.actual}, predicted{" "}
              {p.predicted} vehicles/hour
            </title>
          </rect>
        ))}
      </svg>
      <div className="chart-footnote">
        <span>Volume · vehicles / hour</span>
        <span>Forecast horizon +1 hour</span>
      </div>
    </div>
  );
}
