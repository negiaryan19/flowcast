"""Error segments used in the model report and mentor dashboard."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error


def _metrics(actual: pd.Series, predicted: pd.Series) -> dict[str, float | int]:
    return {
        "observations": int(len(actual)),
        "mae": round(float(mean_absolute_error(actual, predicted)), 2),
        "rmse": round(float(mean_squared_error(actual, predicted) ** 0.5), 2),
    }


def segment_error_analysis(frame: pd.DataFrame, predictions: np.ndarray) -> dict[str, dict]:
    """Measure error across mutually understandable time and weather segments."""
    if len(frame) != len(predictions):
        raise ValueError("Predictions must align with the evaluation frame")
    predicted = pd.Series(predictions, index=frame.index)
    weekday = frame.index.dayofweek < 5
    peak = weekday & frame.index.hour.isin([7, 8, 9, 15, 16, 17, 18])
    masks = {
        "peak_weekday": peak,
        "off_peak_weekday": weekday & ~peak,
        "weekend": ~weekday,
        "wet_weather": (frame["rain_1h"] > 0) | (frame["snow_1h"] > 0),
        "dry_weather": (frame["rain_1h"] <= 0) & (frame["snow_1h"] <= 0),
    }
    return {
        name: _metrics(frame.loc[mask, "target"], predicted.loc[mask])
        for name, mask in masks.items()
        if mask.any()
    }


def data_quality_summary(
    raw: pd.DataFrame, hourly: pd.DataFrame, prepared: pd.DataFrame
) -> dict[str, int]:
    """Summarize transformations without treating inserted gaps as source rows."""
    timestamps = pd.to_datetime(raw["date_time"], errors="coerce").dropna()
    unique_timestamps = int(timestamps.nunique())
    observed_hours = int(hourly["observed"].sum())
    return {
        "source_rows": int(len(raw)),
        "unique_source_timestamps": unique_timestamps,
        "duplicate_weather_rows_collapsed": int(len(timestamps) - unique_timestamps),
        "regular_hourly_slots": int(len(hourly)),
        "missing_traffic_hours": int(len(hourly) - observed_hours),
        "prepared_forecast_rows": int(len(prepared)),
    }
