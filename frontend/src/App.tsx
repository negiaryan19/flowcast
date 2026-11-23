import { lazy, Suspense, useEffect, useState } from "react";

import { loadDashboard } from "./api";
import { TrafficChart } from "./components/TrafficChart";
import type { Forecast, HistoryPoint, ModelMetadata } from "./types";

const TrafficMap = lazy(() =>
  import("./components/TrafficMap").then((module) => ({ default: module.TrafficMap }))
);

type DashboardData = {
  forecast: Forecast;
  history: HistoryPoint[];
  model: ModelMetadata;
};

function displayModel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard().then(setData).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) {
    return (
      <main className="center-state">
        <span className="brand-mark">FC</span>
        <h1>Forecast service unavailable</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="center-state loading-state">
        <span className="brand-mark pulse">FC</span>
        <p>Loading traffic operations…</p>
      </main>
    );
  }

  const { forecast, history, model } = data;
  const test = model.evaluation.test;
  const improvement = Math.round(
    ((test.seasonal.mae - test.gradient_boosting.mae) / test.seasonal.mae) * 100
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">FC</span>
          <div><strong>FlowCast</strong><small>Traffic intelligence</small></div>
        </div>
        <div className="topbar-status">
          <span className="mode-badge"><i />Historical dataset</span>
          <span className="date-range">2012–2018 · I-94 Minnesota</span>
        </div>
        <button className="export-button" onClick={() => window.print()}>Export report</button>
      </header>

      <main className="dashboard">
        <section className="intro-row">
          <div>
            <span className="eyebrow">Operations overview</span>
            <h1>Traffic forecast command center</h1>
            <p>One-hour volume forecast for the represented historical interstate corridor.</p>
          </div>
          <div className="timestamp-card">
            <span>Forecast target</span>
            <strong>{new Date(forecast.target_time).toLocaleString()}</strong>
            <small>Issued from the latest historical sample</small>
          </div>
        </section>

        <section className="metric-grid" aria-label="Forecast metrics">
          <article className="metric-card featured">
            <span>Predicted traffic</span>
            <strong>{Math.round(forecast.predicted_volume).toLocaleString()}</strong>
            <small>{forecast.units} · +{forecast.horizon_hours} hour</small>
          </article>
          <article className="metric-card">
            <span>Test MAE</span>
            <strong>{test.gradient_boosting.mae.toFixed(0)}</strong>
            <small>vehicles/hour</small>
          </article>
          <article className="metric-card">
            <span>Test RMSE</span>
            <strong>{test.gradient_boosting.rmse.toFixed(0)}</strong>
            <small>vehicles/hour</small>
          </article>
          <article className="metric-card positive">
            <span>Baseline improvement</span>
            <strong>{improvement}%</strong>
            <small>lower MAE than weekly baseline</small>
          </article>
        </section>

        <section className="workspace-grid">
          <Suspense fallback={<div className="map-shell map-loading">Loading 3D map…</div>}>
            <TrafficMap forecast={forecast} />
          </Suspense>
          <aside className="insight-panel">
            <div className="panel-heading">
              <span className="eyebrow">Model evidence</span>
              <h2>Forecast details</h2>
            </div>
            <dl className="detail-list">
              <div><dt>Champion model</dt><dd>{displayModel(model.model_name)}</dd></div>
              <div><dt>Features</dt><dd>{model.feature_count}</dd></div>
              <div><dt>Test period</dt><dd>Apr–Sep 2018</dd></div>
              <div><dt>Model version</dt><dd>v{model.model_version}</dd></div>
            </dl>
            <div className="context-block">
              <span className="eyebrow">Location</span>
              <strong>{forecast.location.name}</strong>
              <p>{forecast.location.region}</p>
            </div>
            <div className="notice">
              <strong>Historical demonstration</strong>
              <p>This forecast uses UCI observations and does not represent live traffic.</p>
            </div>
          </aside>
        </section>

        <TrafficChart points={history} />

        <footer className="dashboard-footer">
          <span>Source: UCI Metro Interstate Traffic Volume · CC BY 4.0</span>
          <span>FlowCast model {model.model_version} · {displayModel(model.model_name)}</span>
        </footer>
      </main>
    </div>
  );
}
