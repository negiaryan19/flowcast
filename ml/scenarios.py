"""Weather counterfactual helpers used by the FlowCast scenario API."""

from __future__ import annotations

from typing import Mapping

WEATHER_BOUNDS: dict[str, tuple[float, float]] = {
    "temp": (180.0, 330.0),
    "rain_1h": (0.0, 300.0),
    "snow_1h": (0.0, 100.0),
    "clouds_all": (0.0, 100.0),
}


def weather_scenario_features(
    baseline: Mapping[str, float],
    overrides: Mapping[str, float],
) -> dict[str, float]:
    """Return a bounded copy of model features with weather overrides applied.

    Only weather values may be changed. Lagged traffic features and calendar
    features remain fixed, so the result is a transparent counterfactual—not a
    claim about a new real-world observation.
    """
    unknown = set(overrides) - set(WEATHER_BOUNDS)
    if unknown:
        raise ValueError(f"Unsupported weather fields: {sorted(unknown)}")

    features = dict(baseline)
    for name, value in overrides.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{name} must be a number")
        lower, upper = WEATHER_BOUNDS[name]
        number = float(value)
        if not lower <= number <= upper:
            raise ValueError(f"{name} must be between {lower:g} and {upper:g}")
        features[name] = number
    return features
