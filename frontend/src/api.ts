import type { Forecast, HistoryPoint, ModelMetadata } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadDashboard() {
  const [forecast, history, model] = await Promise.all([
    getJson<Forecast>("/api/v1/forecast/latest"),
    getJson<HistoryPoint[]>("/api/v1/history?limit=48"),
    getJson<ModelMetadata>("/api/v1/model")
  ]);
  return { forecast, history, model };
}
