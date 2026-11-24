# Metro Interstate Traffic Volume dataset card

## Intended use

FlowCast uses this dataset to evaluate one-hour-ahead traffic-volume forecasting for one historical US interstate corridor. It is suitable for a reproducible internship demonstration and model comparison. It does not validate live, citywide, Indian-road, congestion, route travel-time, or collision-risk claims.

## Source and license

- **Creator:** John Hogue
- **Repository:** [UCI Machine Learning Repository, dataset 492](https://archive.ics.uci.edu/dataset/492/metro+interstate+traffic+volume)
- **DOI:** 10.24432/C5X60B
- **License:** CC BY 4.0
- **Coverage:** westbound I-94 ATR 301 between Minneapolis and St Paul, Minnesota, 2012–2018
- **Target:** hourly traffic volume in vehicles per hour

## Inputs used

The first model uses current and lagged traffic volume, temperature, hourly rain and snow, cloud cover, holiday status, and calendar cycles. Text weather descriptions are excluded from the first model.

## Processing decisions

The source can contain multiple weather descriptions for a timestamp. FlowCast collapses these to one hourly record, preserving the median traffic volume and aggregated numeric weather values. It creates a regular hourly index, records whether traffic was observed, and forward-fills weather for at most three hours using past observations only. Leading missing weather and longer gaps stay missing; no backward fill or interpolation is used. Implausible temperature and precipitation values are marked missing before hourly aggregation so they cannot contaminate the aggregates. The literal holiday value `None` is retained, rather than parsed as a missing value.

Model development uses chronological training, validation, and test periods. Feature creation uses only observations at or before the issue time. The test period is retained for final evaluation after model selection on validation data. Version 0.2.0 uses 27,519 prepared observations: 19,263 training, 4,128 validation and 4,128 test. Source timestamps are preserved as local wall-clock values; timezone and daylight-saving ambiguities are not silently converted to UTC.

## Limitations

The dataset represents one direction at one interstate recorder and ends in 2018. Traffic patterns may have changed. It lacks route geometry, free-flow speed, observed travel time, collisions, exposure, and current forecast weather. Results cannot be generalized to another corridor without collecting and evaluating matching data.
