from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from fastapi.testclient import TestClient
from sklearn.dummy import DummyRegressor

from api import main


def baseline_artifact() -> dict:
    return {
        "schema_version": 1,
        "model_version": "test",
        "champion": "persistence",
        "feature_columns": ["volume_now"],
        "horizon_hours": 1,
        "target": "traffic_volume",
        "units": "vehicles/hour",
        "data_mode": "historical",
        "source": "test source",
        "source_period": {"start": "2024-01-01", "end": "2024-02-01"},
        "location": {
            "id": "test-road",
            "name": "Test Road",
            "region": "Test Region",
            "latitude": 10.0,
            "longitude": 20.0,
            "coordinate_note": "Approximate test anchor",
        },
        "latest_features": {"volume_now": 1234.0},
        "latest_baselines": {"persistence": 1234.0, "seasonal": 1200.0},
        "latest_issue_time": "2024-01-31T10:00:00",
        "latest_target_time": "2024-01-31T11:00:00",
        "evaluation": {"validation": {}, "test": {}},
        "error_analysis": {
            "peak_weekday": {"observations": 10, "mae": 42.0, "rmse": 55.0}
        },
        "history": [
            {"timestamp": "2024-01-31T11:00:00", "actual": 1200.0, "predicted": 1234.0}
        ],
    }


def use_artifact(monkeypatch, path: Path) -> None:
    monkeypatch.setattr(main, "store", main.ModelStore(path))


def test_health_reports_missing_artifact(monkeypatch, tmp_path: Path) -> None:
    use_artifact(monkeypatch, tmp_path / "missing.joblib")
    response = TestClient(main.app).get("/health")
    assert response.status_code == 200
    assert response.json()["model_ready"] is False


def test_api_responses_include_security_headers() -> None:
    response = TestClient(main.app).get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "geolocation=()" in response.headers["Permissions-Policy"]


def test_latest_forecast_and_history(monkeypatch, tmp_path: Path) -> None:
    artifact_path = tmp_path / "model.joblib"
    joblib.dump(baseline_artifact(), artifact_path)
    use_artifact(monkeypatch, artifact_path)
    client = TestClient(main.app)

    health = client.get("/health")
    forecast = client.get("/api/v1/forecast/latest")
    history = client.get("/api/v1/history?limit=1")

    assert health.json()["service_version"] == "0.3.0"
    assert health.json()["model_version"] == "test"
    assert health.json()["model_loaded_at"] is not None
    assert forecast.status_code == 200
    assert forecast.json()["predicted_volume"] == 1234.0
    assert forecast.json()["data_mode"] == "historical"
    assert history.status_code == 200
    assert history.json()[0]["actual"] == 1200.0


def test_history_rejects_unsupported_limit(monkeypatch, tmp_path: Path) -> None:
    artifact_path = tmp_path / "model.joblib"
    joblib.dump(baseline_artifact(), artifact_path)
    use_artifact(monkeypatch, artifact_path)
    response = TestClient(main.app).get("/api/v1/history?limit=100")
    assert response.status_code == 422


def test_model_metadata_exposes_error_analysis(monkeypatch, tmp_path: Path) -> None:
    artifact_path = tmp_path / "model.joblib"
    joblib.dump(baseline_artifact(), artifact_path)
    use_artifact(monkeypatch, artifact_path)

    response = TestClient(main.app).get("/api/v1/model")

    assert response.status_code == 200
    assert response.json()["error_analysis"]["peak_weekday"]["mae"] == 42.0


def test_weather_scenario_scores_valid_weather_override(monkeypatch, tmp_path: Path) -> None:
    artifact_path = tmp_path / "model.joblib"
    artifact = baseline_artifact()
    artifact["champion"] = "gradient_boosting"
    model = DummyRegressor(strategy="constant", constant=1010.0)
    model.fit(pd.DataFrame({"volume_now": [1.0]}), [1010.0])
    artifact["model"] = model
    joblib.dump(artifact, artifact_path)
    use_artifact(monkeypatch, artifact_path)

    response = TestClient(main.app).post(
        "/api/v1/scenarios/weather", json={"rain_1h": 10, "clouds_all": 80}
    )

    assert response.status_code == 200
    assert response.json()["scenario_prediction"] == 1010.0
    assert response.json()["difference"] == 0.0
    assert response.json()["overrides"] == {"rain_1h": 10.0, "clouds_all": 80.0}


def test_weather_scenario_requires_an_override(monkeypatch, tmp_path: Path) -> None:
    artifact_path = tmp_path / "model.joblib"
    artifact = baseline_artifact()
    artifact["champion"] = "gradient_boosting"
    model = DummyRegressor(strategy="constant", constant=1010.0)
    model.fit(pd.DataFrame({"volume_now": [1.0]}), [1010.0])
    artifact["model"] = model
    joblib.dump(artifact, artifact_path)
    use_artifact(monkeypatch, artifact_path)

    response = TestClient(main.app).post("/api/v1/scenarios/weather", json={})

    assert response.status_code == 422
    assert "at least one" in response.json()["detail"]
