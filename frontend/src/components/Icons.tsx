const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15",
  chart: "M3 3v18h18 M6 14l4-5 4 3 6-8",
  layers: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  file: "M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h8",
  database:
    "M20 5c0 2-3.6 3-8 3S4 7 4 5s3.6-3 8-3 8 1 8 3z M4 5v14c0 2 3.6 3 8 3s8-1 8-3V5 M4 12c0 2 3.6 3 8 3s8-1 8-3",
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
  search: "M16 10a6 6 0 1 0-12 0 6 6 0 0 0 12 0 M15 15l6 6",
  bell: "M5 16V9a7 7 0 0 1 14 0v7l2 2H3z M9 21h6",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  target:
    "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0 M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0 M12 1v3 M12 20v3 M1 12h3 M20 12h3",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  play: "m8 4 12 8-12 8z",
  pause: "M8 4v16 M16 4v16",
  clock: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0 M12 7v5l3 2",
  logout: "M9 3H3v18h6 M10 12h11 m-5-5 5 5-5 5",
  check: "m4 12 5 5L20 6",
  close: "m6 6 12 12 M6 18 18 6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z m-4 10 3 3 5-6",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
  mail: "M3 5h18v14H3z m0 0 9 8 9-8",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
  user: "M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M4 22v-3a8 8 0 0 1 16 0v3",
  activity: "M2 12h5l3-8 4 16 3-8h5",
  help: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0 M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5 M12 16v1",
  refresh: "M20 8a8 8 0 1 0 0 8 M20 2v6h-6",
  expand: "M9 3H3v6 M15 3h6v6 M3 15v6h6 M21 15v6h-6",
  wave: "M2 8h7l3 8 3-8h7 M2 16h4 M18 16h4",
  bookmark: "M6 3h12v19l-6-4-6 4z",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7z",
  car: "m5 5-3 8v6h3v-3h14v3h3v-6l-3-8z M2 12h20 M6 14h1 M17 14h1",
  calendar: "M3 5h18v16H3z M3 10h18 M7 2v6 M17 2v6",
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M5 23 14 7h13l-4 7H13l-5 9m8-4h8l-4 7h-8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        flowcast<span className="brand-dot">.</span>
        <small>TRAFFIC OPERATIONS</small>
      </span>
    </div>
  );
}
