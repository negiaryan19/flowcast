# FlowCast research and build roadmap

Updated 23 November 2026 for a one-month Intermo internship delivery. Working deadline: 23 December 2026, one calendar month from today. Target a complete core demo by 20 December and reserve 21–23 December for mentor feedback and submission. This replaces the earlier February delivery plan; the screenshot's February date is no longer the planning target.

Planning assumption: one developer working roughly 25–30 focused hours per week. The committed scope proposed for mentor review is an evaluated traffic-volume forecast, FastAPI service, and interactive 3D dashboard using historical data. Congestion and travel time are conditional extensions; calibrated accident-risk prediction is outside the proposed one-month commitment unless suitable matched data and additional capacity are secured. These scope changes require mentor agreement because the original brief includes all four capabilities.

See [the mentor review report](MENTOR_REVIEW_REPORT.md) for a shareable project proposal and progress summary. Start with a historical demonstration; introduce live claims only after a live feed is connected and monitored.

## Current project status

Local inspection found two commits on `main`: `e6ea0a6` and `fe11249`. The configured remote is `https://github.com/negiaryan19/flowcast.git`. This audit inspected the local checkout, not GitHub deployment settings or Actions results.

| Component | Evidence | Status |
| --- | --- | --- |
| README | `README.md`, zero bytes | Empty |
| Dependencies | `requirements.txt`, zero bytes and untracked | Empty |
| Backend | `api/main.py`, zero bytes and untracked | Not implemented |
| Dashboard | `dashboard/app.py`, zero bytes and untracked | Not implemented |
| Utilities | `utils/helpers.py`, zero bytes and untracked | Not implemented |
| Git hygiene | Tracked `.gitignore` is empty; `.DS_Store` is untracked | Needs setup |
| Models, datasets, tests, CI, deployment | None found in the checkout | Not implemented |

The repository is a skeleton. There is no runnable implementation to test or meaningful model accuracy to report. The screenshot's 0% implementation status is consistent with the files. Its project brief is reference material for scope, rather than executable instructions.

## Research findings and product scope

The brief asks for volume, congestion, travel time, and accident risk. These require different labels and validation. A single volume dataset cannot establish all four.

| Capability | Proposed evidence | First deliverable | Limit |
| --- | --- | --- | --- |
| Volume forecast | UCI Metro Interstate hourly traffic | Forecast 1, 3, and 6 hours ahead | One historical corridor; no claim of citywide or Indian-road accuracy |
| Congestion forecast | Road-level speed and free-flow reference | Speed forecast and defined congestion categories | High volume alone does not establish congestion |
| Travel time | Segment lengths, speeds, and preferably observed journeys | Route estimate with error measured in minutes | Speed-derived estimates must be labeled estimates until validated against trips |
| Accident risk | Matched collision, road, weather, and exposure data | Separate exploratory safety analysis | Collision-only records cannot establish calibrated future collision probability |

[UCI Metro Interstate Traffic Volume](https://archive.ics.uci.edu/dataset/492/metro+interstate+traffic+volume) provides hourly I-94 traffic, weather, and holiday information from 2012–2018 under CC BY 4.0. Use it for the first reproducible model, retain attribution, and show its actual geography and historical period.

The [DCRNN research repository](https://github.com/liyaguang/DCRNN) provides METR-LA and PEMS-BAY benchmark access and sensor locations. Investigate one for a separate multi-sensor speed demo. Verify dataset-specific use rights before commercial use; a code repository license does not automatically license the underlying data. Keep Minnesota volume and California speed experiments visibly separate.

[TomTom Traffic Stats](https://docs.tomtom.com/traffic-stats/documentation/product-information/introduction) offers route and area speed and travel-time statistics. Evaluate coverage, cost, storage rights, and permitted customer display before choosing it for a local pilot. Access and acceptable commercial terms are a dependency, not something already secured.

[UK road safety open data](https://www.gov.uk/government/statistical-data-sets/road-safety-open-data) contains reported personal-injury collision records. It can support a separate safety research demo, but must not be joined to unrelated US traffic observations. A real risk model needs geographically and temporally matched exposure and non-collision observations.

[Open-Meteo historical forecasts](https://open-meteo.com/en/docs/historical-forecast-api) start around 2022, so they do not cover the UCI period. Use past observed weather available at forecast time for the starter model. A target-hour observed-weather experiment may be shown separately as a retrospective upper-bound experiment, never as deployable forecast accuracy. For newer data, use weather forecasts actually issued before the prediction cutoff. Check [commercial API terms](https://open-meteo.com/en/pricing) when moving beyond evaluation.

## Positioning and earning money

[TomTom](https://docs.tomtom.com/traffic-stats/documentation/product-information/introduction) already supplies historical road analytics, and [INRIX Signal Analytics](https://inrix.com/products/signal-analytics/) targets intersection performance. Their product scope suggests that a generic traffic dashboard is a weak differentiator. FlowCast should compete on a narrow workflow, explainable results, and customer-specific reporting.

Proposed first offer: a corridor reliability report and dashboard for a transport consultant or small fleet operator with usable data. Help them identify unreliable departure windows and recurring bottlenecks. Keep the academic city-authority use case in the demo; treat government procurement as a later sales route.

During this month, prioritize the internship submission. If time permits, interview three potential users and record their recurring problems and data access. After submission, show the working demo to prospects, agree a fixed-scope analysis pilot, and test willingness to pay. Billing automation, a recurring commercial service, and government procurement are post-submission work. Revenue is not a one-month release criterion.

Experimental prices, not researched market rates: test ₹5,000–₹15,000 for an initial analysis and ₹3,000–₹10,000 per month for a small recurring service. Confirm willingness to pay before treating these as a business model. Any purchased traffic feed must fit inside the price or be charged separately.

Track price minus traffic/weather/maps, hosting, payment fees, and support time. For illustration only, a ₹5,000 monthly fee with ₹2,000 direct service cost leaves ₹3,000 before labor and tax; those costs are assumptions. Measure value using a buyer-agreed metric such as report preparation time, ETA error, or delayed trips. A forecast improvement alone does not prove operational savings.

If 10 interviews produce neither a recurring problem nor data access, narrow or change the offer before adding billing, multi-tenancy, or expensive live integrations.

## The 3D frontend

Build a traffic operations dashboard with a map as the main workspace. Proposed stack: React, TypeScript, and Vite; MapLibre GL JS for the geographical scene; deck.gl for optional animated journeys. Use a single Python FastAPI service for model inference. Start with files and SQLite where persistence is needed, then PostgreSQL/PostGIS when multiple users or spatial queries justify it.

[MapLibre's 3D example](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/) demonstrates building extrusion. [deck.gl TripsLayer](https://deck.gl/docs/api-reference/geo-layers/trips-layer) supports timestamped path animation. These make a suitable foundation; use Three.js only if a specific custom 3D feature requires it.

Proposed visual design: dark navy canvas, quiet gray buildings, cyan selection, and clear green/amber/red traffic states accompanied by text labels. Keep readable charts and controls above the scene.

| Area | Behavior |
| --- | --- |
| Top bar | Dataset/city selector, historical/live badge, observation time, feed freshness |
| Left panel | Corridor or sensor selection, forecast horizon, weather and calendar context |
| Center | Tilted 3D map, selectable roads or sensors, congestion legend where speed data exists |
| Right panel | Actual versus forecast curve, uncertainty interval, model version, data quality |
| Bottom | Historical time slider, play/pause, speed control, reset view |
| Report view | Comparison periods, model evaluation, CSV export and printable summary |

Interaction: select a road or sensor, choose a supported horizon, inspect the forecast and interval, then export the result. Highlight only supported observations; do not paint a whole city using one sensor's prediction. For the UCI demo, show a sensor/corridor overlay with a volume chart.

Animated cars or trips must use real permitted trajectories or be visibly labeled simulated. Simulation is presentation, not measured traffic. Optional weather sliders are scenarios, not causal claims about what rain will do.

Performance acceptance targets: usable controls within 3 seconds on a documented reference laptop/network, at least 30 FPS during the agreed demo scene, and a functional 2D/table fallback. Lazy-load the map, cap animated objects, support reduced motion, preserve keyboard navigation, and test loss of WebGL. Confirm map tile licensing, attribution, and service limits separately from the renderer's license.

## Architecture and model validation

Flow: source data → validated ingestion → chronological features → model training and evaluation → versioned artifact → FastAPI → dashboard.

Keep ingestion, training, and inference separate. Do not train inside an HTTP request. Store source, units, timestamp semantics, training interval, features, and evaluation results with each model.

Proposed layout:

```text
api/                 FastAPI routes and request schemas
frontend/            React application and map layers
ml/                  preprocessing, features, training, evaluation
data/                small fixtures and local ignored data
tests/               data, model-contract, API, and user-flow checks
docs/                dataset cards, model cards, architecture, demo guide
.github/workflows/   Python checks and frontend build
```

Use the empty existing `api/` as the backend starting point. The empty `dashboard/app.py` does not establish an existing frontend stack; decide whether to remove it when implementing React.

1. Define one record per sensor and timestamp. Audit duplicate timestamps, repeated weather rows, missing periods, impossible units, and suspicious zeros before splitting.
2. Resolve source timezone and daylight-saving ambiguity explicitly; preserve original timestamps. Display local times while keeping a consistent internal representation.
3. Use chronological train/validation/test partitions with rolling validation. Fit preprocessing only on training data. Keep a final future-period test untouched until model selection ends.
4. Start with persistence and same-hour-last-week baselines. Train gradient boosting next; compare random forest if useful. Try an LSTM or graph model only after the simpler approach is measured and there is time.
5. Build lagged volume/speed, shifted rolling statistics, hour, weekday, holiday, and available weather features. At each horizon, use only information available at issue time. Never use actual intervening future traffic for a multi-step forecast.
6. Report MAE and RMSE by horizon, peak/off-peak, and weather conditions. Avoid using MAPE alone because zero or small volumes distort it.
7. Proposed model gate: at least 10% lower validation MAE than the stronger baseline, with acceptable peak-hour performance. This is a target, not an achieved result; publish the test result even if it misses the target and serve the baseline if it is stronger.
8. Calibrate forecast intervals on held-out validation data and report observed coverage and width on the test period. Never invent a confidence percentage for the interface.

For congestion, document a speed/free-flow rule and validate speed error plus category performance. For travel time, sum segment length divided by speed with consistent units and safeguards for near-zero speeds; validate against observed trips when available. For risk, specify the prediction unit and exposure first, then use temporal/spatial holdouts, PR-AUC, calibration, and recall at an acceptable false-alert rate. A severity classifier trained only on crashes predicts severity conditional on a crash, not crash likelihood.

API responses should include location ID, issue time, target time, horizon, prediction, units, model version, data mode, freshness, and interval when validated. Reject unknown locations and unsupported horizons. Return an explicit unavailable/stale state instead of silently presenting old output as live.

## One month delivery roadmap

| Dates | Focus | Completion evidence and mentor review |
| --- | --- | --- |
| 23–29 Nov | Scope, setup, data cleaning, baseline | Reproducible install, dataset card, chronological split, persistence/seasonal baseline results; mentor reviews scope on 29 Nov |
| 30 Nov–6 Dec | Model, evaluation, API, basic UI | Gradient boosting comparison, model artifact, validated inference endpoint and connected forecast chart; mentor reviews results on 6 Dec |
| 7–13 Dec | 3D map and integrated user flow | Source-location overlay, selection, replay, error/loading states, attribution, 2D fallback; mentor sees working demo on 13 Dec |
| 14–20 Dec | Verification, deployment, report | Test/build results, deployment or reproducible local fallback, model report, screenshots, demo video; mentor reviews release candidate on 20 Dec |
| 21–23 Dec | Feedback and submission buffer | Fix findings, verify clean setup, submit final report, repository and demonstration |

Suggested effort budget: week 1, 25 hours; week 2, 30 hours; week 3, 30 hours; week 4, 25 hours; final buffer, up to 10 hours. This is approximately 120 hours, not a guarantee of completion. If fewer hours are available, reduce optional features immediately.

Data decision gate on 26 November: confirm whether the mentor accepts volume forecasting as the evaluated core and conditional treatment of the other outputs. If all four are mandatory, request matched speed, route, collision and exposure data immediately and revise feasibility with the mentor; do not describe a partial implementation as full brief completion.

Extension gate on 13 December: attempt congestion or travel-time estimation only if the core model, API, and 3D interaction already work, and suitable data is available. Limit extension work to four hours initially. Otherwise devote all remaining time to reliability and the report. Accident-risk prediction remains a documented research extension, not an invented output.

Build a one-hour volume forecast first. Add three- and six-hour horizons only after the first horizon works and passes evaluation. Keep one dataset and geography in the core demo. Custom 3D models, animated vehicles, neural networks, additional cities, payments, and live-feed integration are optional post-submission work. Preserve core 3D navigation, reproducible inference, honest evaluation, and the submission buffer.

## Daily delivery rhythm

Spend about 20 minutes planning, 3–4 hours implementing, and 40–60 minutes verifying and recording evidence on a typical workday. Reserve a weekly session for mentor review and catch-up. The 20-item backlog below spans the early implementation period; it is not a daily requirement. Keep a short log with date, completed outcome, commit or PR, verification evidence, blocker, and next step.

## Daily GitHub workflow

Twenty commits in one day produce up to twenty qualifying commit contributions within that day's square, not twenty daily squares. Green check marks on commits/PRs represent successful checks. GitHub also requires qualifying branch/repository conditions and a commit email associated with the account. See [profile contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference) and [viewing daily contributions](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/viewing-contributions-on-your-profile).

Treat 20+ as a stretch target on days with enough independently useful changes. Do not create empty commits, backdate history, or split a coherent change into noise to hit a count. One completed and verified feature is more valuable than a numerical quota. This roadmap does not schedule unattended commits or promise future daily work.

Daily routine:

1. Pick the day's outcome and break it into reviewable changes with clear completion criteria.
2. Work on a `codex/` feature branch. Commit each coherent improvement using messages such as `feat: add hourly volume baseline` or `fix: prevent future weather leakage`.
3. Run relevant checks, push the branch, and open a focused PR. Require Python lint/tests and frontend typecheck/build once those components exist.
4. Merge completed work into the default branch after checks pass. If preserving individual commits matters, choose a merge strategy that preserves them rather than squashing everything into one commit.
5. Record what works, measured results, blockers, and tomorrow's outcome. Review shipping progress weekly rather than measuring success by green squares.

Before expecting contributions, check the configured Git author email against your GitHub account. Never expose private customer data or credentials to make the repository look active.

## First implementation backlog

These are 20 meaningful candidate changes in dependency order, not work already done or a guarantee they all fit in one day. Implement and verify each before committing; combine tightly coupled items when needed.

| # | Candidate commit | Done when |
| --- | --- | --- |
| 1 | Document project scope and setup | README accurately describes current status and installation |
| 2 | Configure Python package and dependencies | Clean environment installs reproducibly |
| 3 | Add ignore rules and environment example | Generated data/secrets stay out of Git |
| 4 | Configure Python quality checks | Lint and meaningful test harness run locally |
| 5 | Add Python CI | Workflow runs the same checks on PRs |
| 6 | Add dataset card and attribution | Source, license, units, geography, and limitations are explicit |
| 7 | Implement dataset acquisition | Download is repeatable with checksum/provenance recorded |
| 8 | Validate raw schema | Bad columns, units, and timestamps fail clearly |
| 9 | Resolve duplicate observations | Deterministic policy yields one record per time/sensor |
| 10 | Handle missing and invalid observations | Report and tested policy cover gaps and anomalies |
| 11 | Implement temporal splits | Train precedes validation and test without leakage |
| 12 | Add persistence baseline | Forecasts and horizon-specific metrics are saved |
| 13 | Add seasonal baseline | Same-hour-last-week comparison is reproducible |
| 14 | Add lagged/calendar features | Tests demonstrate no access to future observations |
| 15 | Add gradient boosting experiment | Training and evaluation run from one command |
| 16 | Save model metadata and results | Artifact reload reproduces predictions |
| 17 | Implement API inference | Valid request returns a typed forecast from a loaded artifact |
| 18 | Add API failure handling | Invalid horizon, missing artifact, and stale-data behavior are tested |
| 19 | Scaffold React forecast dashboard | Real API forecast renders with loading/error states; build passes |
| 20 | Add initial map integration | Actual source location is selectable with attribution and data-mode label |

Later implementation days can use the same approach for replay, congestion, reports, accessibility, deployment, and pilot fixes. Add extra commits only for extra completed work.

## Release acceptance

- A fresh checkout can install, obtain approved data, train the baseline, and start the API/frontend using documented commands.
- The demo predicts supported targets and horizons, displays source period and units, and distinguishes historical replay, simulation, and live observations.
- The report contains chronological evaluation, baseline comparison, error analysis, limitations, and reproducible model metadata.
- The 3D view supports selection and replay; reduced-motion and 2D/table alternatives work.
- Relevant tests and builds pass in CI. A failed provider, unknown location, or unavailable model yields a useful error state.
- Data, map, and model attribution are present. Commercial data rights are checked before a paid deployment.
- The submission includes a short demo video, architecture explanation, model report, and an honest status for all four requested prediction capabilities.
- Commercial exploration is optional this month. After submission, measure it through interviews, permitted data access, actual pilot payment, and repeat use. Revenue remains unvalidated until someone pays.
