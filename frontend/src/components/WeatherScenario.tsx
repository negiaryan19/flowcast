import { useState } from "react";

import { runWeatherScenario } from "../api";
import { number } from "../lib/format";
import type { WeatherScenario, WeatherScenarioInput } from "../types";

type Field = {
  key: keyof WeatherScenarioInput;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
};

const fields: Field[] = [
  { key: "temp", label: "Temperature", unit: "K", min: 180, max: 330, step: 1 },
  { key: "rain_1h", label: "Rainfall", unit: "mm", min: 0, max: 300, step: 1 },
  { key: "snow_1h", label: "Snowfall", unit: "mm", min: 0, max: 100, step: 1 },
  {
    key: "clouds_all",
    label: "Cloud cover",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
  },
];

export function WeatherScenario() {
  const [values, setValues] = useState<WeatherScenarioInput>({ rain_1h: 10 });
  const [result, setResult] = useState<WeatherScenario | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function update(key: keyof WeatherScenarioInput, value: string) {
    setResult(null);
    setValues((current) => ({
      ...current,
      [key]: value === "" ? undefined : Number(value),
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      setResult(await runWeatherScenario(values));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Scenario unavailable.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel scenario-panel" aria-labelledby="scenario-title">
      <div className="scenario-heading">
        <div>
          <span className="caps">COUNTERFACTUAL LAB</span>
          <h2 id="scenario-title">Weather scenario simulator</h2>
          <p>
            Change known weather inputs while traffic history and calendar stay
            fixed.
          </p>
        </div>
        <span className="pill subtle">Experimental</span>
      </div>
      <form onSubmit={submit} className="scenario-form">
        <div className="scenario-inputs">
          {fields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <div>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={values[field.key] ?? ""}
                  onChange={(event) => update(field.key, event.target.value)}
                />
                <small>{field.unit}</small>
              </div>
            </label>
          ))}
        </div>
        <button className="primary-button" disabled={pending}>
          {pending ? "Running scenario…" : "Run scenario"}
        </button>
      </form>
      {error && (
        <p className="scenario-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="scenario-result" aria-live="polite">
          <div>
            <span>Baseline</span>
            <strong>{number(result.baseline_prediction, 1)}</strong>
          </div>
          <div>
            <span>Scenario</span>
            <strong>{number(result.scenario_prediction, 1)}</strong>
          </div>
          <div className={result.difference >= 0 ? "increase" : "decrease"}>
            <span>Change</span>
            <strong>
              {result.difference >= 0 ? "+" : ""}
              {number(result.difference, 1)}
            </strong>
          </div>
          <p>{result.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
