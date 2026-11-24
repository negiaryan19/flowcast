# FlowCast mentor demonstration guide

This four-minute walkthrough presents the implemented historical traffic-volume forecasting core. Start the API and frontend as documented in the README, then open the dashboard and choose **Explore demo workspace**.

## 1. Frame the project — 30 seconds

Say that FlowCast forecasts hourly traffic volume one hour ahead for the historical westbound I-94 ATR 301 corridor near Minneapolis–St Paul. The dashboard uses UCI's Metro Interstate Traffic Volume dataset, covering 2012–2018. It is a reproducible historical demonstration, not a live traffic service.

## 2. Show the operations workspace — 45 seconds

On **Overview**, point out the observed volume, one-hour forecast, test MAE and baseline improvement. Use the replay play button, then drag the time slider. The map, selected forecast card and chart change together. Switch between 3D and 2D to show the spatial view is usable on different devices.

## 3. Explain the model evidence — 60 seconds

Open **Model lab**. Explain that train, validation and test periods are chronological. Gradient Boosting recorded a held-out test MAE of 136.95 vehicles/hour and RMSE of 206.83; the weekly seasonal baseline recorded MAE 297.79.

Use **Where the model works harder** to show that weekday peak MAE is higher than off-peak MAE. Explain that these are error measurements, not accuracy percentages. Open **Data sources** and show the preparation audit: repeated source timestamps are collapsed, missing traffic is retained as missing, and weather fills use only earlier observations.

## 4. Show traceability — 45 seconds

Open **Forecast history**, filter a timestamp, and select a chart point. Then open **Reports** and download the CSV or JSON evaluation. Mention that CSV contains source-local timestamps, observed volume, prediction and absolute error.

## 5. State the current scope honestly — 30 seconds

The implemented capability is one-hour historical traffic-volume forecasting for one corridor, with a FastAPI service and interactive dashboard. The dashboard includes a public demo and local workspace accounts. Live traffic, citywide congestion, route travel time and accident-risk prediction need additional matched datasets and are not presented as implemented.

## Questions to invite

1. Is the historical traffic-volume core acceptable for the internship milestone?
2. Is an Indian/local data source required for the final assessment?
3. Which next capability should be prioritized after the core: live feed deployment, congestion with speed data, or travel time with journey data?
