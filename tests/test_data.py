from __future__ import annotations

from datetime import timedelta
from pathlib import Path

import pandas as pd
import pytest

from ml.data import FEATURE_COLUMNS, build_features, chronological_split, clean_hourly, load_raw


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


def test_csv_preserves_none_as_non_holiday_label(tmp_path: Path) -> None:
    raw = sample_raw()
    raw.loc[170, "holiday"] = "New Years Day"
    path = tmp_path / "traffic.csv"
    raw.to_csv(path, index=False)

    loaded = load_raw(path)
    features = build_features(clean_hourly(loaded))

    assert loaded.loc[0, "holiday"] == "None"
    assert features.loc[raw.loc[169, "date_time"], "is_holiday"] == 0
    assert features.loc[raw.loc[170, "date_time"], "is_holiday"] == 1


def test_future_weather_cannot_change_an_earlier_feature_row() -> None:
    raw = sample_raw()
    raw.loc[170, "temp"] = float("nan")
    changed = raw.copy()
    changed.loc[171:, "temp"] = 320.0
    issue_time = raw.loc[170, "date_time"]

    original_features = build_features(clean_hourly(raw))
    changed_features = build_features(clean_hourly(changed))

    pd.testing.assert_frame_equal(
        original_features.loc[:issue_time, FEATURE_COLUMNS],
        changed_features.loc[:issue_time, FEATURE_COLUMNS],
    )
    assert original_features.loc[issue_time, "temp"] == raw.loc[169, "temp"]


def test_weather_uses_past_values_and_keeps_unfillable_gaps_missing() -> None:
    raw = sample_raw()
    raw.loc[0:2, "temp"] = 0.0
    raw.loc[170:173, "temp"] = float("nan")

    hourly = clean_hourly(raw)
    features = build_features(hourly)

    assert hourly.iloc[:3]["temp"].isna().all()
    assert hourly.iloc[170:173]["temp"].eq(raw.loc[169, "temp"]).all()
    assert pd.isna(hourly.iloc[173]["temp"])
    assert raw.loc[173, "date_time"] not in features.index
    assert hourly.iloc[174]["temp"] == raw.loc[174, "temp"]


def test_invalid_weather_is_removed_before_duplicate_aggregation() -> None:
    raw = sample_raw()
    duplicate = raw.iloc[[170]].copy()
    duplicate["temp"] = 0.0
    duplicate["rain_1h"] = 9831.0
    duplicate["snow_1h"] = -1.0
    duplicate["clouds_all"] = 200.0
    duplicate["holiday"] = "Test holiday"
    raw_with_duplicate = pd.concat([raw, duplicate], ignore_index=True)

    hourly = clean_hourly(raw_with_duplicate)
    row = hourly.loc[raw.loc[170, "date_time"]]

    assert hourly.index.is_unique
    assert row["source_rows"] == 2
    assert row["traffic_volume"] == raw.loc[170, "traffic_volume"]
    for column in ["temp", "rain_1h", "snow_1h", "clouds_all"]:
        assert row[column] == raw.loc[170, column]
    assert row["holiday"] == "Test holiday"


def test_missing_traffic_is_not_filled_from_future_observations() -> None:
    raw = sample_raw().drop(index=170)
    hourly = clean_hourly(raw)
    missing_time = pd.Timestamp("2024-01-08 02:00:00")

    assert pd.isna(hourly.loc[missing_time, "traffic_volume"])
    assert not hourly.loc[missing_time, "observed"]
    assert missing_time not in build_features(hourly).index


@pytest.mark.parametrize("horizon", [169, 200])
def test_weekly_baseline_rejects_horizons_that_require_future_data(horizon: int) -> None:
    with pytest.raises(ValueError, match="at most 168"):
        build_features(clean_hourly(sample_raw()), horizon=horizon)


@pytest.mark.parametrize("horizon", [1.5, True])
def test_horizon_requires_integer_hours(horizon) -> None:
    with pytest.raises(ValueError, match="integer"):
        build_features(clean_hourly(sample_raw()), horizon=horizon)


def test_weekly_baseline_at_maximum_horizon_uses_issue_time_volume() -> None:
    features = build_features(clean_hourly(sample_raw(500)), horizon=168)

    assert not features.empty
    pd.testing.assert_series_equal(
        features["seasonal_baseline"], features["volume_now"], check_names=False
    )
