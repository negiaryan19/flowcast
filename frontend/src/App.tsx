import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getSession, loadDashboard, signOut } from "./api";
import { Login } from "./components/Login";
import { Brand, Icon } from "./components/Icons";
import type { IconName } from "./components/Icons";
import { TrafficChart } from "./components/TrafficChart";
import {
  downloadFile,
  exportHistory,
  modelName,
  number,
  sourceTime,
} from "./lib/format";
import type { User } from "./types";
const TrafficMap = lazy(() =>
  import("./components/TrafficMap").then((m) => ({ default: m.TrafficMap })),
);
type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
type View =
  | "overview"
  | "network"
  | "history"
  | "models"
  | "reports"
  | "sources"
  | "settings";
const navigation: {
  id: View;
  label: string;
  icon: IconName;
  group?: string;
}[] = [
  { id: "overview", label: "Overview", icon: "grid", group: "WORKSPACE" },
  { id: "network", label: "Network explorer", icon: "map" },
  { id: "history", label: "Forecast history", icon: "clock" },
  { id: "models", label: "Model lab", icon: "layers" },
  { id: "reports", label: "Reports", icon: "file", group: "MANAGE" },
  { id: "sources", label: "Data sources", icon: "database" },
  { id: "settings", label: "Settings", icon: "settings" },
];
const descriptions: Record<View, string> = {
  overview: "A little perspective. A clearer road ahead.",
  network: "Explore the geography behind your forecast.",
  history: "Every observation. Every forecast. The full picture.",
  models: "Know what your model knows. Measure what it misses.",
  reports: "Make your findings useful beyond the dashboard.",
  sources: "Good decisions start with knowing your data.",
  settings: "Make this workspace work for you.",
};
type Preferences = {
  threeD: boolean;
  reducedMotion: boolean;
  compactNumbers: boolean;
};
const defaults: Preferences = {
  threeD: true,
  reducedMotion: false,
  compactNumbers: false,
};
function loadPreferences(): Preferences {
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem("flowcast-preferences") ?? "{}"),
    };
  } catch {
    return defaults;
  }
}
function readView(): View {
  const hash = location.hash.slice(1);
  return navigation.some((n) => n.id === hash) ? (hash as View) : "overview";
}
function Sparkline({
  values,
  tone = "olive",
}: {
  values: number[];
  tone?: string;
}) {
  if (!values.length) return null;
  const min = Math.min(...values),
    max = Math.max(...values),
    span = max - min || 1;
  const d = values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${(i / Math.max(1, values.length - 1)) * 100},${38 - ((v - min) / span) * 32}`,
    )
    .join(" ");
  return (
    <svg
      className={`sparkline ${tone}`}
      viewBox="0 0 100 44"
      aria-hidden="true"
    >
      <path d={`${d} L100,44 L0,44 Z`} fill="currentColor" opacity=".08" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function Metric({
  label,
  value,
  unit,
  note,
  icon,
  values,
  featured = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
  icon: IconName;
  values?: number[];
  featured?: boolean;
}) {
  return (
    <article className={`metric-card ${featured ? "featured" : ""}`}>
      <div className="metric-label">
        <span>{label}</span>
        <Icon name={icon} size={18} />
      </div>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="metric-bottom">
        <span>{note}</span>
        {values && <Sparkline values={values} />}
      </div>
    </article>
  );
}
function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState<User | null>(null),
    [entered, setEntered] = useState(false),
    [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    getSession()
      .then(({ user }) => {
        if (active && user) {
          setSession(user);
          setEntered(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  if (checking)
    return (
      <div className="app-loading">
        <Brand />
        <span className="loader" />
        <p>Preparing your workspace…</p>
      </div>
    );
  if (!entered)
    return (
      <Login
        onEnter={(user) => {
          setSession(user);
          setEntered(true);
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
      />
    );
  return (
    <Workspace
      user={session}
      onLeave={() => {
        setSession(null);
        setEntered(false);
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
    />
  );
}
function Workspace({
  user,
  onLeave,
}: {
  user: User | null;
  onLeave: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [view, setView] = useState<View>(readView);
  const [mobileMenu, setMobileMenu] = useState(false),
    [query, setQuery] = useState(""),
    [command, setCommand] = useState(false),
    [toast, setToast] = useState("");
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const change = () => setIsMobile(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const [range, setRange] = useState(48),
    [index, setIndex] = useState(47),
    [playing, setPlaying] = useState(false),
    [tableQuery, setTableQuery] = useState("");
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences),
    [showDetails, setShowDetails] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  };
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setData(await loadDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load forecasts.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    const change = () => {
      setView(readView());
      setPlaying(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("flowcast-preferences", JSON.stringify(prefs));
    } catch {}
    document.documentElement.dataset.motion = prefs.reducedMotion
      ? "reduced"
      : "auto";
  }, [prefs]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((c) => !c);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (command) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [command]);
  const points = useMemo(
    () => data?.history.slice(-range) ?? [],
    [data, range],
  );
  useEffect(() => {
    setIndex(Math.max(0, points.length - 1));
    setPlaying(false);
  }, [points.length, range]);
  useEffect(() => {
    if (!playing || !points.length) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % points.length),
      900,
    );
    return () => clearInterval(timer);
  }, [playing, points.length]);
  function go(next: View) {
    setView(next);
    location.hash = next;
    setMobileMenu(false);
    setCommand(false);
    setQuery("");
    setPlaying(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function leave() {
    try {
      if (user) await signOut();
      onLeave();
    } catch {
      notify("Could not sign out. Check the API connection and try again.");
    }
  }
  const current = points[Math.min(index, points.length - 1)],
    metric =
      data?.model.evaluation.test.champion ??
      data?.model.evaluation.test[data?.model.model_name ?? ""];
  const baseline = data?.model.evaluation.test.seasonal,
    improvement =
      baseline && metric && baseline.mae > 0
        ? (1 - metric.mae / baseline.mae) * 100
        : null;
  const num = (v: number) =>
    prefs.compactNumbers
      ? new Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(v)
      : number(v);
  const title = navigation.find((n) => n.id === view)?.label ?? "Overview";
  const filtered = points.filter((p) =>
    p.timestamp.toLowerCase().includes(tableQuery.toLowerCase()),
  );
  const selectedTimestamp =
    current?.timestamp ?? data?.forecast.target_time ?? "";
  return (
    <div className="workspace">
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileMenu ? "is-open" : ""}`}
        inert={isMobile && !mobileMenu}
      >
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">F</span>
          <span>
            FlowCast workspace
            <small>{user ? "Personal workspace" : "Demo workspace"}</small>
          </span>
          <Icon name="down" size={15} />
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <div key={n.id}>
              {n.group && <span className="nav-caption">{n.group}</span>}
              <button
                className={view === n.id ? "active" : ""}
                onClick={() => go(n.id)}
                aria-current={view === n.id ? "page" : undefined}
              >
                <Icon name={n.icon} size={19} />
                {n.label}
                {n.id === "network" && <span className="nav-tag">3D</span>}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="source-status">
            <span className="status-dot" />
            <span>
              Historical research mode<small>UCI · Minnesota, USA</small>
            </span>
          </div>
          <button className="account-button" onClick={() => go("settings")}>
            <span className="user-avatar">
              {user ? user.name.slice(0, 2).toUpperCase() : "DA"}
            </span>
            <span>
              {user?.name ?? "Demo analyst"}
              <small>{user ? "Local account" : "Public preview"}</small>
            </span>
            <Icon name="settings" size={16} />
          </button>
          <button className="signout-button" onClick={leave}>
            <Icon name="logout" size={17} />
            {user ? "Sign out" : "Exit demo"}
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <Icon name="chevron" size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-button"
              aria-label="Search workspace"
              onClick={() => setCommand(true)}
            >
              <Icon name="search" size={17} />
              <span>Find a view or action</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="beta-tag">BETA 0.2</span>
            <button
              className="icon-button"
              title="Refresh forecast data"
              aria-label="Refresh forecast data"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <Icon name="refresh" size={18} />
            </button>
            <button
              className="top-avatar"
              title="Workspace settings"
              aria-label="Workspace settings"
              onClick={() => go("settings")}
            >
              {user ? user.name[0].toUpperCase() : "D"}
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">FLOWCAST INTELLIGENCE</span>
              <h1>
                {view === "overview" ? "The road ahead, in focus." : title}
              </h1>
              <p>{descriptions[view]}</p>
            </div>
            <div className="page-actions">
              {data && (
                <span className="date-pill">
                  <Icon name="calendar" size={17} />
                  {sourceTime(selectedTimestamp, true).split(",")[0]}
                </span>
              )}
              <button
                className="primary-button"
                onClick={() => {
                  if (data) {
                    exportHistory(points);
                    notify("Forecast history exported as CSV.");
                  }
                }}
                disabled={!data}
              >
                <Icon name="download" size={16} /> Export data
              </button>
            </div>
          </div>
          {error ? (
            <section className="error-state" role="alert">
              <Icon name="activity" size={35} />
              <h2>Let’s reconnect your forecast.</h2>
              <p>{error}</p>
              <button className="primary-button" onClick={() => void refresh()}>
                Try again
              </button>
            </section>
          ) : !data ? (
            <div className="loading-grid" aria-label="Loading forecast data">
              <div />
              <div />
              <div />
              <div />
              <section />
              <section />
            </div>
          ) : (
            <>
              {(view === "overview" || view === "network") && (
                <>
                  <div className="context-bar">
                    <span>
                      <span className="region-dot" />
                      <strong>I-94 Westbound</strong>
                      <span className="context-divider" />
                      Minneapolis–St Paul
                    </span>
                    <span className="historical-badge">
                      <Icon name="clock" size={14} /> Historical observations
                    </span>
                  </div>
                  {view === "overview" && (
                    <section
                      className="metric-grid"
                      aria-label="Traffic metrics"
                    >
                      <Metric
                        label="Forecast volume"
                        value={num(
                          current?.predicted ?? data.forecast.predicted_volume,
                        )}
                        unit="veh/h"
                        note="One hour ahead"
                        icon="car"
                        values={points.map((p) => p.predicted)}
                        featured
                      />
                      <Metric
                        label="Observed volume"
                        value={num(current?.actual ?? 0)}
                        unit="veh/h"
                        note="Selected observation"
                        icon="activity"
                        values={points.map((p) => p.actual)}
                      />
                      <Metric
                        label="Model error · MAE"
                        value={metric ? number(metric.mae, 1) : "—"}
                        unit="veh/h"
                        note="Across the held-out test period"
                        icon="target"
                      />
                      <Metric
                        label="Baseline improvement"
                        value={
                          improvement === null
                            ? "—"
                            : `${number(improvement, 1)}%`
                        }
                        note="Lower MAE vs. weekly baseline"
                        icon="chart"
                      />
                    </section>
                  )}
                  <section
                    className={`network-grid ${view === "network" ? "expanded-network" : ""}`}
                  >
                    <div className="panel map-panel">
                      <PanelTitle
                        title="A new perspective on traffic"
                        subtitle="One corridor. A connected view."
                        action={
                          <span className="pill subtle">
                            <Icon name="map" size={14} /> Spatial view
                          </span>
                        }
                      />
                      <Suspense
                        fallback={
                          <div className="map-shell map-placeholder">
                            <span className="loader" />
                            Preparing the 3D explorer…
                          </div>
                        }
                      >
                        <TrafficMap
                          forecast={data.forecast}
                          point={current}
                          default3D={prefs.threeD}
                          reducedMotion={prefs.reducedMotion}
                          onSelect={() => setShowDetails(!showDetails)}
                        />
                      </Suspense>
                      <div className="replay-bar">
                        <button
                          className="replay-button"
                          aria-label={playing ? "Pause replay" : "Play replay"}
                          onClick={() => setPlaying(!playing)}
                          disabled={!points.length}
                        >
                          <Icon name={playing ? "pause" : "play"} size={16} />
                        </button>
                        <div className="replay-copy">
                          <strong>{sourceTime(selectedTimestamp)}</strong>
                          <small>Source local time</small>
                        </div>
                        <input
                          aria-label="Historical replay position"
                          type="range"
                          min="0"
                          max={Math.max(0, points.length - 1)}
                          value={index}
                          onChange={(e) => {
                            setPlaying(false);
                            setIndex(Number(e.target.value));
                          }}
                        />
                        <span className="replay-count">
                          {index + 1} / {points.length}
                        </span>
                      </div>
                    </div>
                    <aside className="insights-column">
                      <div className="panel forecast-panel">
                        <span className="caps">
                          SELECTED FORECAST <Icon name="bolt" size={17} />
                        </span>
                        <div className="forecast-title">
                          <span className="route-badge">I-94</span>
                          <div>
                            <h3>Westbound corridor</h3>
                            <p>Automatic traffic recorder 301</p>
                          </div>
                        </div>
                        <div className="selected-volume">
                          {num(
                            current?.predicted ??
                              data.forecast.predicted_volume,
                          )}
                          <span>vehicles / hour</span>
                        </div>
                        <div className="forecast-compare">
                          <span>
                            Observed<strong>{num(current?.actual ?? 0)}</strong>
                          </span>
                          <span>
                            Absolute error
                            <strong>
                              {number(
                                Math.abs(
                                  (current?.actual ?? 0) -
                                    (current?.predicted ?? 0),
                                ),
                                1,
                              )}
                            </strong>
                          </span>
                        </div>
                        <div className="forecast-note">
                          <Icon name="clock" size={17} />
                          <span>
                            +1 hour forecast horizon
                            <br />
                            <small>{sourceTime(selectedTimestamp, true)}</small>
                          </span>
                        </div>
                        <button
                          className="text-button wide-link"
                          onClick={() => go("history")}
                        >
                          Explore forecast history
                          <Icon name="clock" size={16} />
                        </button>
                        {showDetails && (
                          <div className="sensor-details">
                            <strong>About this location</strong>
                            <p>
                              {data.forecast.location.coordinate_note}. One
                              recorder is represented; road geometry is
                              contextual, not a citywide prediction.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="insight-card">
                        <span className="insight-icon">
                          <Icon name="layers" size={19} />
                        </span>
                        <h3>Evidence behind every forecast.</h3>
                        <p>
                          {modelName(data.model.model_name)} uses{" "}
                          {data.model.feature_count} traffic, weather and
                          calendar features.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => go("models")}
                        >
                          Open model lab
                          <Icon name="layers" size={16} />
                        </button>
                      </div>
                    </aside>
                  </section>
                  <section className="panel chart-panel">
                    <PanelTitle
                      title="The patterns behind the movement"
                      subtitle="Observed traffic and one-hour predictions"
                      action={
                        <RangeSelector range={range} setRange={setRange} />
                      }
                    />
                    <TrafficChart
                      points={points}
                      selected={index}
                      onSelect={(i) => {
                        setIndex(i);
                        setPlaying(false);
                      }}
                    />
                  </section>
                </>
              )}
              {view === "history" && (
                <>
                  <section className="panel chart-panel">
                    <PanelTitle
                      title="Forecast replay"
                      subtitle="Select a point to inspect its observed and predicted values."
                      action={
                        <RangeSelector range={range} setRange={setRange} />
                      }
                    />
                    <TrafficChart
                      points={points}
                      selected={index}
                      onSelect={setIndex}
                    />
                  </section>
                  <section className="panel history-panel">
                    <PanelTitle
                      title="Observation ledger"
                      subtitle={`${filtered.length} records · source local timestamps`}
                      action={
                        <label className="table-search">
                          <Icon name="search" size={16} />
                          <input
                            aria-label="Filter observations by date or time"
                            placeholder="Filter date or time…"
                            value={tableQuery}
                            onChange={(e) => setTableQuery(e.target.value)}
                          />
                        </label>
                      }
                    />
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Target time</th>
                            <th>Observed · veh/h</th>
                            <th>Predicted · veh/h</th>
                            <th>Absolute error</th>
                            <th>Horizon</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered
                            .slice()
                            .reverse()
                            .map((p) => (
                              <tr key={p.timestamp}>
                                <td>{sourceTime(p.timestamp, true)}</td>
                                <td>{number(p.actual)}</td>
                                <td>
                                  <span className="cell-forecast">
                                    {number(p.predicted, 1)}
                                  </span>
                                </td>
                                <td>
                                  {number(Math.abs(p.actual - p.predicted), 1)}
                                </td>
                                <td>
                                  <span className="pill subtle">+1 hour</span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {!filtered.length && (
                        <p className="empty-chart">
                          No observations match this filter.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              )}
              {view === "models" && (
                <>
                  <div className="model-hero">
                    <div>
                      <span className="caps">CURRENT CHAMPION</span>
                      <h2>{modelName(data.model.model_name)}</h2>
                      <p>
                        Selected on validation error. Measured on a later,
                        held-out test period.
                      </p>
                      <span className="pill">
                        VERSION {data.model.model_version}
                      </span>
                    </div>
                    <div className="model-score">
                      <strong>{metric ? number(metric.mae, 1) : "—"}</strong>
                      <span>test MAE · vehicles / hour</span>
                    </div>
                  </div>
                  <section className="panel">
                    <PanelTitle
                      title="Performance, compared"
                      subtitle="Lower error is better. These are forecasting errors, not accuracy percentages."
                    />
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Model</th>
                            <th>Validation MAE</th>
                            <th>Test MAE</th>
                            <th>Test RMSE</th>
                            <th>Selection</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.model.evaluation.test)
                            .filter(([key]) => key !== "champion")
                            .map(([key, value]) => (
                              <tr key={key}>
                                <td>{modelName(key)}</td>
                                <td>
                                  {number(
                                    data.model.evaluation.validation[key]
                                      ?.mae ?? 0,
                                    2,
                                  )}
                                </td>
                                <td>{number(value.mae, 2)}</td>
                                <td>{number(value.rmse, 2)}</td>
                                <td>
                                  {key === data.model.model_name ? (
                                    <span className="pill green">
                                      <Icon name="check" size={13} />
                                      Champion
                                    </span>
                                  ) : (
                                    <span className="pill subtle">
                                      Baseline
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="panel">
                    <PanelTitle
                      title="Where the model works harder"
                      subtitle="Held-out test error grouped by time and observed weather."
                    />
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Segment</th>
                            <th>Observations</th>
                            <th>MAE · veh/h</th>
                            <th>RMSE · veh/h</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.model.error_analysis ?? {}).map(
                            ([name, value]) => (
                              <tr key={name}>
                                <td>{modelName(name)}</td>
                                <td>{number(value.observations)}</td>
                                <td>{number(value.mae, 2)}</td>
                                <td>{number(value.rmse, 2)}</td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="summary-note">
                      Peak weekday means 07:00–09:59 and 15:00–18:59 on
                      Monday–Friday. Weather groups use observations available
                      at forecast issue time.
                    </p>
                  </section>
                  <div className="two-columns">
                    <section className="panel">
                      <PanelTitle
                        title="Chronological evaluation"
                        subtitle="Training precedes validation; testing comes last."
                      />
                      <div className="split-bar">
                        <i />
                        <i />
                        <i />
                      </div>
                      <dl className="data-list">
                        {Object.entries(
                          data.model.evaluation_periods ?? {},
                        ).map(([name, period]) => (
                          <div key={name}>
                            <dt>
                              {modelName(name)}
                              <small>
                                {number(data.model.row_counts?.[name] ?? 0)}{" "}
                                observations
                              </small>
                            </dt>
                            <dd>
                              {period[0]?.slice(0, 10)} to{" "}
                              {period[1]?.slice(0, 10)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                    <section className="panel scope-card">
                      <PanelTitle title="What this model can tell you" />
                      <p>
                        Hourly traffic volume at one historical interstate
                        recorder. The source ends in 2018.
                      </p>
                      <div className="scope-item">
                        <Icon name="check" />
                        Volume forecasts with measured error
                      </div>
                      <div className="scope-item muted">
                        <Icon name="clock" />
                        Travel time needs matched journey data
                      </div>
                      <div className="scope-item muted">
                        <Icon name="clock" />
                        Congestion needs speed observations
                      </div>
                      <div className="scope-item muted">
                        <Icon name="clock" />
                        Accident risk needs collision and exposure data
                      </div>
                    </section>
                  </div>
                </>
              )}
              {view === "reports" && (
                <>
                  <div className="report-grid">
                    <ReportCard
                      icon="download"
                      title="Forecast observations"
                      text="Download the selected historical observations, predictions and errors as a CSV."
                      label="Download CSV"
                      onClick={() => {
                        exportHistory(points);
                        notify("CSV downloaded.");
                      }}
                    />
                    <ReportCard
                      icon="layers"
                      title="Model evaluation"
                      text="Export the current model version, validation scores and test metrics in JSON."
                      label="Download evaluation"
                      onClick={() => {
                        downloadFile(
                          "flowcast-model-evaluation.json",
                          JSON.stringify(data.model, null, 2),
                          "application/json",
                        );
                        notify("Model evaluation downloaded.");
                      }}
                    />
                    <ReportCard
                      icon="file"
                      title="Mentor review summary"
                      text="A print-friendly summary of your model results, source data and project scope."
                      label="Print report"
                      onClick={() => window.print()}
                    />
                  </div>
                  <section className="panel printable-summary">
                    <PanelTitle
                      title="Project review summary"
                      subtitle="FlowCast · Intermo internship project"
                    />
                    <dl className="data-list">
                      <div>
                        <dt>Model</dt>
                        <dd>
                          {modelName(data.model.model_name)} · v
                          {data.model.model_version}
                        </dd>
                      </div>
                      <div>
                        <dt>Prediction</dt>
                        <dd>Traffic volume, one hour ahead</dd>
                      </div>
                      <div>
                        <dt>Test MAE / RMSE</dt>
                        <dd>
                          {number(metric?.mae ?? 0, 2)} /{" "}
                          {number(metric?.rmse ?? 0, 2)} vehicles per hour
                        </dd>
                      </div>
                      <div>
                        <dt>Source</dt>
                        <dd>UCI Metro Interstate Traffic Volume · CC BY 4.0</dd>
                      </div>
                      <div>
                        <dt>Coverage</dt>
                        <dd>
                          {data.model.source_period.start.slice(0, 10)} –{" "}
                          {data.model.source_period.end.slice(0, 10)}
                        </dd>
                      </div>
                    </dl>
                    <p className="summary-note">
                      Historical one-corridor evaluation. Live traffic, travel
                      time, congestion and accident-risk predictions are not
                      available in this release.
                    </p>
                  </section>
                </>
              )}
              {view === "sources" && (
                <>
                  <div className="source-hero">
                    <span className="source-logo">
                      <Icon name="database" size={36} />
                    </span>
                    <div>
                      <span className="caps">PRIMARY DATASET</span>
                      <h2>Metro Interstate Traffic Volume</h2>
                      <p>
                        University of California, Irvine · Machine Learning
                        Repository
                      </p>
                    </div>
                    <span className="pill green">
                      <Icon name="check" size={14} />
                      Connected locally
                    </span>
                  </div>
                  <div className="two-columns">
                    <section className="panel">
                      <PanelTitle title="Dataset details" />
                      <dl className="data-list">
                        <div>
                          <dt>Source records</dt>
                          <dd>
                            {data.model.row_counts?.raw
                              ? number(data.model.row_counts.raw)
                              : "See training report"}
                          </dd>
                        </div>
                        <div>
                          <dt>Period</dt>
                          <dd>2012–2018</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>I-94 westbound, Minnesota</dd>
                        </div>
                        <div>
                          <dt>License</dt>
                          <dd>CC BY 4.0 · John Hogue</dd>
                        </div>
                        <div>
                          <dt>Data mode</dt>
                          <dd>Historical observations</dd>
                        </div>
                      </dl>
                      <a
                        className="source-link"
                        href="https://archive.ics.uci.edu/dataset/492/metro+interstate+traffic+volume"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View original dataset
                      </a>
                    </section>
                    <section className="panel">
                      <PanelTitle title="Signals that inform the forecast" />
                      <div className="feature-grid">
                        {[
                          "Current volume",
                          "24h / 168h lags",
                          "Rolling volume",
                          "Temperature",
                          "Rain and snow",
                          "Cloud cover",
                          "Holiday status",
                          "Calendar cycles",
                        ].map((f) => (
                          <span key={f}>
                            <Icon name="check" size={15} />
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="summary-note">
                        Weather gaps use past observations only. Future traffic
                        and weather are excluded from issue-time features.
                      </p>
                    </section>
                  </div>
                  <section className="panel scope-card">
                    <PanelTitle
                      title="Next connections"
                      subtitle="Research extensions, not active data feeds."
                    />
                    <div className="future-grid">
                      {[
                        ["Speed observations", "For measured congestion"],
                        ["Journey data", "For travel-time evaluation"],
                        ["Collision + exposure", "For risk research"],
                      ].map(([title, copy]) => (
                        <div key={title}>
                          <Icon name="database" />
                          <h3>{title}</h3>
                          <p>{copy}</p>
                          <span className="pill subtle">DATA REQUIRED</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {view === "settings" && (
                <div className="settings-layout">
                  <section className="panel">
                    <PanelTitle
                      title="Workspace preferences"
                      subtitle="Saved in this browser. Applied immediately."
                    />
                    <Setting
                      title="Start with the 3D map"
                      text="Open the explorer with tilted buildings and a spatial perspective."
                      value={prefs.threeD}
                      change={(v) => setPrefs({ ...prefs, threeD: v })}
                    />
                    <Setting
                      title="Reduce motion"
                      text="Minimize animated map transitions and decorative movement."
                      value={prefs.reducedMotion}
                      change={(v) => setPrefs({ ...prefs, reducedMotion: v })}
                    />
                    <Setting
                      title="Compact large numbers"
                      text="Display summary volumes as 1.2K instead of 1,200."
                      value={prefs.compactNumbers}
                      change={(v) => setPrefs({ ...prefs, compactNumbers: v })}
                    />
                    <button
                      className="secondary-button reset-button"
                      onClick={() => {
                        setPrefs(defaults);
                        notify("Workspace preferences reset.");
                      }}
                    >
                      Reset preferences
                    </button>
                  </section>
                  <section className="panel account-panel">
                    <span className="large-avatar">
                      {user ? user.name[0] : "D"}
                    </span>
                    <h2>{user?.name ?? "Demo analyst"}</h2>
                    <p>
                      {user?.email ??
                        "Exploring the public historical workspace"}
                    </p>
                    <span className="pill subtle">
                      {user ? "LOCAL ACCOUNT" : "DEMO SESSION"}
                    </span>
                    <p className="summary-note">
                      {user
                        ? "Your account is stored on this local server. Email verification and password recovery are not enabled."
                        : "Explore without an account. Historical traffic data is public; a demo session does not grant private access."}
                    </p>
                    <button className="secondary-button" onClick={leave}>
                      <Icon name="logout" size={17} />
                      {user ? "Sign out" : "Back to sign in"}
                    </button>
                  </section>
                </div>
              )}
              <footer className="workspace-footer">
                <span>
                  <span className="status-dot" />
                  Historical research workspace · source local time
                </span>
                <span>FlowCast · {data.model.source} · CC BY 4.0</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="command-dialog"
        onCancel={() => setCommand(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCommand(false);
        }}
      >
        <div className="command-search">
          <Icon name="search" />
          <input
            aria-label="Search workspace"
            placeholder="Where would you like to go?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => setCommand(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="command-results">
          {navigation
            .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
            .map((n) => (
              <button key={n.id} onClick={() => go(n.id)}>
                <Icon name={n.icon} />
                {n.label}
                <Icon name="chevron" size={14} />
              </button>
            ))}
          {!navigation.some((n) =>
            n.label.toLowerCase().includes(query.toLowerCase()),
          ) && <p>No views match “{query}”.</p>}
        </div>
        <footer>
          Navigate your workspace <kbd>ESC to close</kbd>
        </footer>
      </dialog>
    </div>
  );
}
function RangeSelector({
  range,
  setRange,
}: {
  range: number;
  setRange: (n: number) => void;
}) {
  return (
    <div className="segmented" aria-label="Observation window">
      {[24, 48, 72].map((n) => (
        <button key={n} onClick={() => setRange(n)} aria-pressed={range === n}>
          {n} records
        </button>
      ))}
    </div>
  );
}
function ReportCard({
  icon,
  title,
  text,
  label,
  onClick,
}: {
  icon: IconName;
  title: string;
  text: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <article className="panel report-card">
      <span className="report-icon">
        <Icon name={icon} size={25} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="secondary-button" onClick={onClick}>
        <Icon name="download" size={16} />
        {label}
      </button>
    </article>
  );
}
function Setting({
  title,
  text,
  value,
  change,
}: {
  title: string;
  text: string;
  value: boolean;
  change: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <button
        className="toggle"
        role="switch"
        aria-label={title}
        aria-checked={value}
        onClick={() => change(!value)}
      >
        <span />
      </button>
    </div>
  );
}
