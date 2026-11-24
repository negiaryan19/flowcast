import numpy as np
import pandas as pd
import pytest

from ml.analysis import segment_error_analysis


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
