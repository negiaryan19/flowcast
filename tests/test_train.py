from __future__ import annotations

import numpy as np
import pandas as pd

from ml.train import metrics, predict_champion


def test_metrics_are_reported_in_traffic_units() -> None:
    result = metrics(pd.Series([100.0, 200.0]), np.array([110.0, 180.0]))
    assert result == {"mae": 15.0, "rmse": 15.81}


def test_baseline_champion_uses_named_baseline_column() -> None:
    frame = pd.DataFrame({"seasonal_baseline": [120.0, 140.0]})
    predicted = predict_champion({"champion": "seasonal"}, frame)
    assert predicted.tolist() == [120.0, 140.0]
