"""Train and evaluate the first FlowCast one-hour forecasting model."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from ml.data import FEATURE_COLUMNS, build_features, chronological_split, clean_hourly, load_raw
from ml.download_data import CSV_PATH, download

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_PATH = ROOT / "artifacts" / "traffic_volume_1h.joblib"
REPORT_PATH = ROOT / "reports" / "model_metrics.json"


def metrics(actual: pd.Series, predicted: np.ndarray | pd.Series) -> dict[str, float]:
    return {
        "mae": round(float(mean_absolute_error(actual, predicted)), 2),
        "rmse": round(float(mean_squared_error(actual, predicted) ** 0.5), 2),
    }


def predict_champion(artifact: dict, frame: pd.DataFrame) -> np.ndarray:
    champion = artifact["champion"]
    if champion == "gradient_boosting":
        return artifact["model"].predict(frame[FEATURE_COLUMNS])
    return frame[f"{champion}_baseline"].to_numpy()


def train() -> dict:
    csv_path = CSV_PATH if CSV_PATH.exists() else download()
    raw = load_raw(csv_path)
    hourly = clean_hourly(raw)
    prepared = build_features(hourly, horizon=1)
    split = chronological_split(prepared)

    model = HistGradientBoostingRegressor(
        learning_rate=0.08,
        max_iter=220,
        max_leaf_nodes=31,
        l2_regularization=1.0,
        random_state=42,
    )
    model.fit(split.train[FEATURE_COLUMNS], split.train["target"])

    validation_results = {
        "persistence": metrics(
            split.validation["target"], split.validation["persistence_baseline"]
        ),
        "seasonal": metrics(split.validation["target"], split.validation["seasonal_baseline"]),
        "gradient_boosting": metrics(
            split.validation["target"], model.predict(split.validation[FEATURE_COLUMNS])
        ),
    }
    champion = min(validation_results, key=lambda name: validation_results[name]["mae"])

    artifact = {
        "schema_version": 1,
        "model_version": "0.1.0",
        "trained_at": datetime.now(UTC).isoformat(),
        "champion": champion,
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "horizon_hours": 1,
        "target": "traffic_volume",
        "units": "vehicles/hour",
        "data_mode": "historical",
        "source": "UCI Metro Interstate Traffic Volume",
        "source_period": {
            "start": str(hourly.index.min()),
            "end": str(hourly.index.max()),
        },
        "location": {
            "id": "i94-atr-301-westbound",
            "name": "I-94 ATR 301 Westbound",
            "region": "Minneapolis–St Paul, Minnesota, USA",
            "latitude": 44.9537,
            "longitude": -93.0900,
        },
        "latest_features": prepared.iloc[-1][FEATURE_COLUMNS].to_dict(),
        "latest_issue_time": prepared.index[-1].isoformat(),
        "latest_target_time": prepared.iloc[-1]["target_time"].isoformat(),
    }
    test_predictions = predict_champion(artifact, split.test)
    test_results = {
        "persistence": metrics(split.test["target"], split.test["persistence_baseline"]),
        "seasonal": metrics(split.test["target"], split.test["seasonal_baseline"]),
        "gradient_boosting": metrics(
            split.test["target"], model.predict(split.test[FEATURE_COLUMNS])
        ),
        "champion": metrics(split.test["target"], test_predictions),
    }
    artifact["evaluation"] = {
        "validation": validation_results,
        "test": test_results,
    }
    artifact["latest_baselines"] = {
        "persistence": float(prepared.iloc[-1]["persistence_baseline"]),
        "seasonal": float(prepared.iloc[-1]["seasonal_baseline"]),
    }

    history = split.test.tail(72).copy()
    history_predictions = predict_champion(artifact, history)
    artifact["history"] = [
        {
            "timestamp": target_time.isoformat(),
            "actual": round(float(actual), 1),
            "predicted": round(float(predicted), 1),
        }
        for target_time, actual, predicted in zip(
            history["target_time"], history["target"], history_predictions, strict=True
        )
    ]

    report = {
        "generated_at": artifact["trained_at"],
        "rows": {
            "raw": len(raw),
            "hourly": len(hourly),
            "prepared": len(prepared),
            "train": len(split.train),
            "validation": len(split.validation),
            "test": len(split.test),
        },
        "periods": {
            "train": [str(split.train.index.min()), str(split.train.index.max())],
            "validation": [str(split.validation.index.min()), str(split.validation.index.max())],
            "test": [str(split.test.index.min()), str(split.test.index.max())],
        },
        "validation": validation_results,
        "champion": champion,
        "test": test_results,
    }

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, ARTIFACT_PATH)
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    print(f"Saved model artifact: {ARTIFACT_PATH}")
    return report


if __name__ == "__main__":
    train()
