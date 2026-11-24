import pytest

from ml.scenarios import weather_scenario_features


def test_weather_scenario_changes_only_weather_values() -> None:
    baseline = {"temp": 280.0, "rain_1h": 0.0, "clouds_all": 20.0, "volume_now": 900.0}

    result = weather_scenario_features(baseline, {"rain_1h": 12, "clouds_all": 90})

    assert result["rain_1h"] == 12.0
    assert result["clouds_all"] == 90.0
    assert result["temp"] == 280.0
    assert result["volume_now"] == 900.0


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"wind": 3}, "Unsupported weather fields"),
        ({"rain_1h": -1}, "rain_1h must be between 0 and 300"),
        ({"temp": True}, "temp must be a number"),
    ],
)
def test_weather_scenario_rejects_invalid_inputs(
    overrides: dict[str, object], message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        weather_scenario_features({"temp": 280.0, "rain_1h": 0.0}, overrides)
