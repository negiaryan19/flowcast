import numpy as np
import pandas as pd
import pytest

from ml.analysis import data_quality_summary, segment_error_analysis


def test_segment_analysis_counts_and_errors() -> None:
    index = pd.date_range("2026-11-20 07:00", periods=72, freq="h")
    frame = pd.DataFrame(
        {
            "target": np.arange(72, dtype=float) + 100,
            "rain_1h": [1.0 if i % 10 == 0 else 0.0 for i in range(72)],
            "snow_1h": 0.0,
        },
        index=index,
    )
    predictions = frame["target"].to_numpy() + 10

    result = segment_error_analysis(frame, predictions)

    assert result["peak_weekday"]["observations"] > 0
    assert result["weekend"]["observations"] == 48
    assert result["wet_weather"]["observations"] == 8
    assert all(segment["mae"] == 10 for segment in result.values())


def test_segment_analysis_rejects_misaligned_predictions() -> None:
    frame = pd.DataFrame(
        {"target": [1.0], "rain_1h": [0.0], "snow_1h": [0.0]},
        index=pd.date_range("2026-01-01", periods=1, freq="h"),
    )
    with pytest.raises(ValueError, match="align"):
        segment_error_analysis(frame, np.array([]))


def test_data_quality_summary_distinguishes_rows_gaps_and_duplicates() -> None:
    raw = pd.DataFrame(
        {"date_time": ["2026-01-01 00:00", "2026-01-01 00:00", "2026-01-01 02:00"]}
    )
    hourly = pd.DataFrame({"observed": [True, False, True]})
    prepared = pd.DataFrame(index=range(1))

    assert data_quality_summary(raw, hourly, prepared) == {
        "source_rows": 3,
        "unique_source_timestamps": 2,
        "duplicate_weather_rows_collapsed": 1,
        "regular_hourly_slots": 3,
        "missing_traffic_hours": 1,
        "prepared_forecast_rows": 1,
    }
