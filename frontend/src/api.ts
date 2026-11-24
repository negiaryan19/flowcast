import type {
  Forecast,
  HistoryPoint,
  ModelMetadata,
  User,
  WeatherScenario,
  WeatherScenarioInput,
} from "./types";
const API_BASE = import.meta.env.VITE_API_URL ?? "";
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    throw new Error(
      "Cannot reach FlowCast. Check that the local API is running, then try again.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const d = body?.detail;
    throw new Error(
      typeof d === "string"
        ? d
        : Array.isArray(d)
          ? d.map((i: { msg: string }) => i.msg).join(". ")
          : "The request could not be completed. Please try again.",
    );
  }
  return response.json() as Promise<T>;
}
export async function loadDashboard() {
  const [forecast, history, model] = await Promise.all([
    request<Forecast>("/api/v1/forecast/latest"),
    request<HistoryPoint[]>("/api/v1/history?limit=72"),
    request<ModelMetadata>("/api/v1/model"),
  ]);
  return { forecast, history, model };
}
export const getSession = () =>
  request<{ user: User | null }>("/api/v1/auth/me");
export const signOut = () => request("/api/v1/auth/logout", { method: "POST" });
export const authenticate = (
  mode: "login" | "register",
  values: { name?: string; email: string; password: string },
) =>
  request<{ user: User }>(`/api/v1/auth/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
export const runWeatherScenario = (overrides: WeatherScenarioInput) =>
  request<WeatherScenario>("/api/v1/scenarios/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(overrides),
  });
