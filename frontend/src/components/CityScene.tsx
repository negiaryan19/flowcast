const iso = (x: number, y: number, z = 0) => [
  420 + (x - y) * 26,
  95 + (x + y) * 13 - z,
];
const poly = (points: number[][]) => points.map((p) => p.join(",")).join(" ");
export function CityScene() {
  const blocks = Array.from({ length: 121 }, (_, i) => ({
    x: i % 11,
    y: Math.floor(i / 11),
  })).filter(({ x, y }) => x !== 4 && y !== 5 && x !== 8);
  return (
    <svg
      className="city-scene"
      viewBox="0 0 850 560"
      role="img"
      aria-label="Illustrated isometric city with illuminated traffic routes"
    >
      <defs>
        <linearGradient id="city-top" x2="1" y2="1">
          <stop stopColor="#52604f" />
          <stop offset="1" stopColor="#2b3a30" />
        </linearGradient>
        <linearGradient id="city-front" x2="0" y2="1">
          <stop stopColor="#31483a" />
          <stop offset="1" stopColor="#18291f" />
        </linearGradient>
        <filter id="route-glow">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <radialGradient id="city-ground">
          <stop stopColor="#344538" />
          <stop offset="1" stopColor="#151d19" />
        </radialGradient>
      </defs>
      <ellipse
        cx="420"
        cy="360"
        rx="330"
        ry="145"
        fill="#080e0a"
        opacity=".6"
      />
      <polygon
        points={poly([iso(-1, -1), iso(12, -1), iso(12, 12), iso(-1, 12)])}
        fill="url(#city-ground)"
        stroke="#53634c"
        strokeWidth=".7"
      />
      {Array.from({ length: 13 }, (_, i) => (
        <g key={i} stroke="#718268" strokeOpacity=".15">
          <path d={`M${iso(i, -1)} L${iso(i, 12)}`} />
          <path d={`M${iso(-1, i)} L${iso(12, i)}`} />
        </g>
      ))}
      {[
        "M" + iso(4.5, -1) + " L" + iso(4.5, 12),
        "M" + iso(-1, 5.5) + " L" + iso(12, 5.5),
        "M" + iso(8.5, -1) + " L" + iso(8.5, 12),
      ].map((d, i) => (
        <g key={d}>
          <path
            d={d}
            stroke={i === 2 ? "#52bca2" : "#d8f271"}
            strokeWidth="12"
            opacity=".18"
            filter="url(#route-glow)"
          />
          <path
            d={d}
            fill="none"
            stroke={i === 2 ? "#5abfa3" : "#b9d25a"}
            strokeWidth="1.7"
            strokeDasharray={i === 2 ? "3 6" : undefined}
          />
          <circle r="3" fill="#f0ffba" className="city-car">
            <animateMotion
              dur={`${6 + i * 2}s`}
              repeatCount="indefinite"
              path={d}
            />
          </circle>
        </g>
      ))}
      {blocks.map(({ x, y }) => {
        const h =
            18 + ((x * 17 + y * 23) % 60) + (x > 5 && x < 8 && y < 4 ? 70 : 0),
          w = 0.72;
        const a = iso(x, y),
          b = iso(x + w, y),
          c = iso(x + w, y + w);
        const t = [
          iso(x, y, h),
          iso(x + w, y, h),
          iso(x + w, y + w, h),
          iso(x, y + w, h),
        ];
        return (
          <g key={`${x}-${y}`}>
            <polygon
              points={poly([a, b, t[1], t[0]])}
              fill="#1b2a23"
              stroke="#6c8161"
              strokeOpacity=".3"
              strokeWidth=".5"
            />
            <polygon
              points={poly([b, c, t[2], t[1]])}
              fill="url(#city-front)"
              stroke="#8fa177"
              strokeOpacity=".3"
              strokeWidth=".5"
            />
            <polygon
              points={poly(t)}
              fill="url(#city-top)"
              stroke="#acb99b"
              strokeOpacity=".5"
              strokeWidth=".6"
            />
            {Array.from({ length: Math.floor(h / 12) }, (_, j) => (
              <path
                key={j}
                d={`M${iso(x + w, y + 0.14, 8 + j * 12)} L${iso(x + w, y + 0.57, 8 + j * 12)}`}
                stroke={(x + y) % 3 === 0 ? "#cce486" : "#78927a"}
                strokeOpacity=".6"
                strokeWidth="1.6"
              />
            ))}
          </g>
        );
      })}
      <g transform={`translate(${iso(4.5, 5.5)})`}>
        <ellipse rx="23" ry="12" fill="none" stroke="#d9f578" opacity=".5" />
        <ellipse rx="12" ry="6" fill="#def78c" opacity=".3" />
        <path d="M0 0v-52" stroke="#dbf18d" strokeDasharray="3 3" />
        <circle cy="-52" r="5" fill="#dff791" />
      </g>
    </svg>
  );
}
