"""Cleaning and leakage-safe feature preparation for one-hour forecasts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd

REQUIRED_COLUMNS = {
    "holiday",
    "temp",
    "rain_1h",
    "snow_1h",
    "clouds_all",
    "date_time",
    "traffic_volume",
}

FEATURE_COLUMNS = [
    "temp",
    "rain_1h",
    "snow_1h",
    "clouds_all",
    "is_holiday",
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",
    "volume_now",
    "volume_lag_24h",
    "volume_lag_168h",
    "volume_mean_6h",
    "volume_mean_24h",
]


@dataclass(frozen=True)
class SplitData:
    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame


def load_raw(path: Path | str) -> pd.DataFrame:
    frame = pd.read_csv(path)
    missing = REQUIRED_COLUMNS - set(frame.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")
    return frame


def clean_hourly(raw: pd.DataFrame) -> pd.DataFrame:
    """Collapse repeated weather rows and create a regular hourly series."""
    frame = raw.copy()
    frame["date_time"] = pd.to_datetime(frame["date_time"], errors="coerce")
    numeric = ["temp", "rain_1h", "snow_1h", "clouds_all", "traffic_volume"]
    for column in numeric:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame = frame.dropna(subset=["date_time", "traffic_volume"])

    hourly = (
        frame.groupby("date_time", sort=True)
        .agg(
            temp=("temp", "mean"),
            rain_1h=("rain_1h", "max"),
            snow_1h=("snow_1h", "max"),
            clouds_all=("clouds_all", "mean"),
            holiday=("holiday", lambda values: next((v for v in values if v != "None"), "None")),
            traffic_volume=("traffic_volume", "median"),
            source_rows=("traffic_volume", "size"),
        )
        .sort_index()
    )

    full_index = pd.date_range(hourly.index.min(), hourly.index.max(), freq="h")
    hourly = hourly.reindex(full_index)
    hourly.index.name = "date_time"
    hourly["observed"] = hourly["traffic_volume"].notna()

    weather = ["temp", "rain_1h", "snow_1h", "clouds_all"]
    hourly[weather] = hourly[weather].interpolate(limit=3, limit_direction="both")
    hourly["holiday"] = hourly["holiday"].fillna("None")
    hourly["source_rows"] = hourly["source_rows"].fillna(0).astype(int)

    # Extreme values in the source are treated as missing weather observations.
    hourly.loc[~hourly["temp"].between(180, 330), "temp"] = np.nan
    hourly.loc[~hourly["rain_1h"].between(0, 300), "rain_1h"] = np.nan
    hourly.loc[~hourly["snow_1h"].between(0, 100), "snow_1h"] = np.nan
    hourly[weather] = hourly[weather].ffill().bfill()
    return hourly


def build_features(hourly: pd.DataFrame, horizon: int = 1) -> pd.DataFrame:
    if horizon < 1:
        raise ValueError("Forecast horizon must be at least one hour")

    data = hourly.copy()
    index = data.index
    data["is_holiday"] = (data["holiday"] != "None").astype(int)
    data["hour_sin"] = np.sin(2 * np.pi * index.hour / 24)
    data["hour_cos"] = np.cos(2 * np.pi * index.hour / 24)
    data["dow_sin"] = np.sin(2 * np.pi * index.dayofweek / 7)
    data["dow_cos"] = np.cos(2 * np.pi * index.dayofweek / 7)
    data["month_sin"] = np.sin(2 * np.pi * (index.month - 1) / 12)
    data["month_cos"] = np.cos(2 * np.pi * (index.month - 1) / 12)
    data["volume_now"] = data["traffic_volume"]
    data["volume_lag_24h"] = data["traffic_volume"].shift(24)
    data["volume_lag_168h"] = data["traffic_volume"].shift(168)
    data["volume_mean_6h"] = data["traffic_volume"].rolling(6, min_periods=6).mean()
    data["volume_mean_24h"] = data["traffic_volume"].rolling(24, min_periods=24).mean()
    data["persistence_baseline"] = data["traffic_volume"]
    data["seasonal_baseline"] = data["traffic_volume"].shift(168 - horizon)
    data["target"] = data["traffic_volume"].shift(-horizon)
    data["target_time"] = index + timedelta(hours=int(horizon))

    keep = FEATURE_COLUMNS + [
        "persistence_baseline",
        "seasonal_baseline",
        "target",
        "target_time",
        "observed",
    ]
    return data[keep].dropna(
        subset=FEATURE_COLUMNS + ["persistence_baseline", "seasonal_baseline", "target"]
    )


def chronological_split(
    features: pd.DataFrame, train_fraction: float = 0.70, validation_fraction: float = 0.15
) -> SplitData:
    if not 0 < train_fraction < 1 or not 0 < validation_fraction < 1:
        raise ValueError("Split fractions must be between zero and one")
    if train_fraction + validation_fraction >= 1:
        raise ValueError("Training and validation fractions must leave a test period")

    train_end = int(len(features) * train_fraction)
    validation_end = int(len(features) * (train_fraction + validation_fraction))
    return SplitData(
        train=features.iloc[:train_end].copy(),
        validation=features.iloc[train_end:validation_end].copy(),
        test=features.iloc[validation_end:].copy(),
    )
