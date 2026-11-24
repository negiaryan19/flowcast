import type { HistoryPoint } from "../types";
export const number = (v: number, d = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: d }).format(v);
export const modelName = (v: string) =>
  v.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
// Preserve source-local timestamps; do not reinterpret them in the viewer's timezone.
export function sourceTime(v: string, date = false) {
  if (!v) return "—";
  const [day, time = "00:00"] = v.replace(" ", "T").split("T");
  const [y, m, d] = day.split("-");
  return date
    ? `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${y}, ${time.slice(0, 5)}`
    : time.slice(0, 5);
}
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportHistory(points: HistoryPoint[]) {
  downloadFile(
    "flowcast-forecast-history.csv",
    "source_local_time,observed_vehicles_per_hour,predicted_vehicles_per_hour,absolute_error\n" +
      points
        .map(
          (p) =>
            `${p.timestamp},${p.actual},${p.predicted},${Math.abs(p.actual - p.predicted).toFixed(1)}`,
        )
        .join("\n"),
    "text/csv;charset=utf-8",
  );
}
