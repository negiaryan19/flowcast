from __future__ import annotations

from datetime import timedelta

import pandas as pd
import pytest

from ml.data import FEATURE_COLUMNS, build_features, chronological_split, clean_hourly


def sample_raw(hours: int = 240) -> pd.DataFrame:
    timestamps = pd.date_range("2024-01-01", periods=hours, freq="h")
    return pd.DataFrame(
        {
            "holiday": ["None"] * hours,
            "temp": [280 + (i % 6) for i in range(hours)],
            "rain_1h": [0.0] * hours,
            "snow_1h": [0.0] * hours,
            "clouds_all": [30] * hours,
            "weather_main": ["Clouds"] * hours,
            "weather_description": ["scattered clouds"] * hours,
            "date_time": timestamps,
            "traffic_volume": [1000 + i * 5 for i in range(hours)],
        }
    )


def test_features_use_current_data_to_predict_next_hour() -> None:
    features = build_features(clean_hourly(sample_raw()), horizon=1)
    first = features.iloc[0]

    assert list(features.columns[: len(FEATURE_COLUMNS)]) == FEATURE_COLUMNS
    assert first["target_time"] == features.index[0] + timedelta(hours=1)
    assert first["target"] == 1000 + (168 + 1) * 5
    assert first["volume_now"] == 1000 + 168 * 5


def test_chronological_split_keeps_future_test_period() -> None:
    features = build_features(clean_hourly(sample_raw()), horizon=1)
    split = chronological_split(features)

    assert split.train.index.max() < split.validation.index.min()
    assert split.validation.index.max() < split.test.index.min()
    assert len(split.train) + len(split.validation) + len(split.test) == len(features)


def test_horizon_must_be_positive() -> None:
    with pytest.raises(ValueError, match="at least one"):
        build_features(clean_hourly(sample_raw()), horizon=0)
