# FlowCast internship project review report

**Organization:** Intermo  
**Project:** FlowCast — AI-Powered Smart Traffic Flow Prediction Platform  
**Report date:** 24 November 2026  
**Proposed project period:** 23 November–23 December 2026  
**Report type:** Progress report and implementation proposal
**Repository:** [negiaryan19/flowcast](https://github.com/negiaryan19/flowcast)

## Project summary

FlowCast aims to help users understand traffic patterns and anticipate changes through machine learning and an interactive 3D dashboard. The original brief covers traffic volume, congestion, travel time, and accident risk using traffic, weather, and calendar data.

For the one-month internship delivery, the proposed core is a reproducible traffic-volume forecasting system, a backend prediction API, and a 3D map interface displaying historical observations and forecasts. Congestion and travel-time estimation are conditional extensions. Validated accident-risk prediction is proposed as future work because it requires additional matched collision and traffic-exposure data. This narrower scope is submitted for mentor review, rather than presented as an approved change to the brief.

## Current progress

Development began on 23 November from a repository containing two initial commits and empty starter files. The active `codex/one-month-build` branch now contains the data pipeline, trained model, forecast API, responsive 3D dashboard, tests, and project documentation. The current implementation uses historical data locally and has not been deployed.

| Work area | Current status | Next deliverable |
| --- | --- | --- |
| Scope and planning | One-month plan and mentor report prepared | Mentor feedback on scope |
| Data | Reproducible UCI download, cleaning, features and dataset card implemented | Review duplicate and missing-period policy |
| Machine learning | Persistence, weekly baseline and gradient boosting evaluated | Mentor review of results and error analysis |
| Backend | FastAPI metadata, forecast/replay and local account/session endpoints implemented | Add deployment configuration after hosting decision |
| Frontend | Seven-view React workspace, login, MapLibre 3D/2D map, replay and exports implemented | Collect mentor feedback and test on target device |
| Testing and delivery | 30 backend tests, Python lint, TypeScript check, production build and npm audit pass locally | Record final demonstration and choose hosting |

The chronological held-out test period contains 4,128 prepared observations from April to September 2018. Gradient boosting achieved MAE 136.95 vehicles/hour and RMSE 206.83. The weekly seasonal baseline achieved MAE 297.79 and RMSE 618.26, so the model reduced test MAE by about 54%. These results measure historical forecast error for one corridor. Response time, local traffic generalization, operational impact, and revenue have not been measured.

The implementation branch is pushed to GitHub in [draft PR #6](https://github.com/negiaryan19/flowcast/pull/6). Both frontend and backend jobs passed in [GitHub Actions](https://github.com/negiaryan19/flowcast/actions/runs/45321336232) for implementation commit `cd3f0b0`. The pull request remains open for review; deployment is pending.

## Verification recorded on 24 November

- All 30 Python tests and Ruff checks pass locally; TypeScript and the Vite production build pass.
- Desktop and 390px mobile layouts reviewed in the in-app browser. The production build renders the 3D map and its bundled worker.
- Tested public demo entry, replay play/pause, 2D switching, history range/filter, command search and keyboard chart selection.
- Downloaded CSV verified: 48 observations with source-local timestamps, actual values, predictions and absolute errors.
- Tested local account creation, incorrect-password handling, sign-in, session persistence across reload and sign-out using a synthetic test account.
- Screenshots: [login](docs/screenshots/login.jpg), [dashboard](docs/screenshots/dashboard.jpg), [mobile login](docs/screenshots/login-mobile.jpg), [mobile dashboard](docs/screenshots/dashboard-mobile.jpg).

Known verification limits: the map dependency produces a large-chunk build advisory; the external basemap reports a missing decorative wood-pattern sprite although the map renders. Formal FPS/load-time benchmarking, offline/WebGL-disabled testing, production deployment are still pending. A Starlette/AnyIO deprecation warning appears in the test run.

## Objectives and proposed scope

| Deliverable | One-month commitment proposed for review |
| --- | --- |
| Traffic-volume forecasting | Core: predict one hour ahead, with longer horizons only after the initial pipeline is verified |
| Data preparation | Core: document provenance, clean duplicates and invalid values, handle missing periods, preserve timestamp meaning |
| Model comparison | Core: compare persistence and seasonal baselines with gradient boosting |
| Prediction API | Core: serve a saved model and return prediction, units, timestamps, source and model version |
| 3D dashboard | Core: map navigation, source-location selection, observed/forecast chart, historical replay, export and 2D fallback |
| Congestion prediction | Conditional: requires suitable speed observations and a documented congestion definition |
| Travel-time estimation | Conditional: requires route geometry and speed or trip observations; label unvalidated estimates clearly |
| Accident-risk prediction | Future work unless suitable matched data and sufficient time are secured |
| Live monitoring and monetization | Post-submission work; the core demonstration uses historical data |

Completing the proposed core would demonstrate an end-to-end forecasting application. It would not establish completion of all four predictive capabilities in the original brief without mentor-approved scope adjustment.

## Dataset and methodology

The implemented starter source is [UCI Metro Interstate Traffic Volume](https://archive.ics.uci.edu/dataset/492/metro+interstate+traffic+volume), which contains historical hourly traffic with weather and holiday features for an I-94 corridor in Minnesota. It supports a volume experiment, not a claim of local Indian-road performance or citywide coverage. Attribution will be retained.

The pipeline resolves repeated timestamps, rejects implausible weather, builds lagged traffic/calendar features and splits observations chronologically. Version 0.2.0 corrects earlier weather interpolation: short weather gaps now use past observations only, and the literal non-holiday label `None` is preserved. The model was retrained and all reported metrics were regenerated after these corrections. Features use information available at their issue time; future observed traffic and target-hour observed weather are excluded.

Persistence and same-hour-last-week predictions establish reference performance. Gradient boosting is compared using mean absolute error (MAE) and root mean squared error (RMSE). Detailed peak-hour error analysis is still pending. The final test period will remain untouched during model selection. If the learned model does not outperform the baseline, the result will be reported honestly and the stronger method will remain available.

The proposed improvement target was at least 10% lower validation MAE than the stronger baseline. Gradient boosting recorded validation MAE 167.19, compared with 394.44 for the weekly seasonal baseline. Forecast intervals are still deferred until they can be calibrated and evaluated.

## Technical design and 3D experience

| Layer | Proposed technology and responsibility |
| --- | --- |
| Data and modeling | Implemented with Python, pandas and scikit-learn |
| Backend | Implemented with FastAPI and a versioned local model artifact |
| Frontend | Implemented with React, TypeScript and Vite |
| 3D mapping | Implemented with MapLibre GL JS, OpenFreeMap tiles and building extrusion |
| Storage | Local dataset/model files and SQLite accounts with hashed passwords and session tokens |
| Verification | Python tests, lint, TypeScript checking, production build, dependency audit and browser review completed locally |

Data will flow from ingestion and validation to feature generation, model training, evaluation, saved artifact, API, and dashboard. Training will remain separate from API requests.

The user will select the represented location and historical time, view an observed-versus-predicted chart, and inspect the forecast's units, horizon and provenance. The map will show the geography supported by the dataset. A single corridor model will not be presented as forecasting every road in a city.

The redesigned frontend uses an ivory workspace, charcoal navigation, lime accents and a dark 3D map. The login page includes an illustrative isometric city. Overview, network explorer, forecast history, model lab, reports, data sources and settings are implemented. Replay and chart selection update the selected historical forecast; users can download CSV history, export model evaluation JSON and print a mentor summary. A 2D/table alternative will support devices without usable WebGL. Any later animated vehicles will be labeled simulated unless based on actual permitted trajectories. [MapLibre's building example](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/) establishes the proposed rendering approach.

## One month schedule and review points

The working deadline assumes the month begins on 23 November 2026. The core release is targeted for 20 December, leaving three days for feedback and submission.

| Period | Planned work | Evidence for mentor review |
| --- | --- | --- |
| Week 1, 23–29 Nov | Confirm scope, initialize environment, acquire and clean data, implement baseline | Dataset card, data audit, baseline results and repository setup |
| Week 2, 30 Nov–6 Dec | Train and compare model, save artifact, implement API, connect basic chart | Evaluation table, model metadata, API demonstration and forecast chart |
| Week 3, 7–13 Dec | Implement 3D map, selection, historical replay and fallback | Integrated demo, screenshots, source labels and interaction checks |
| Week 4, 14–20 Dec | Verify application, prepare deployment, finalize report and video | Test/build evidence, reproducible setup, release candidate and demonstration |
| Buffer, 21–23 Dec | Address mentor feedback and submit | Final report, repository reference, demo video and known limitations |

Estimated effort is approximately 25–30 focused hours per week, plus up to 10 hours in the final buffer. This assumes the starter dataset is accessible and optional extensions do not displace the core work.

## Verification and completion criteria

1. A fresh environment can follow documented steps to obtain data, train the baseline, and run the API and frontend.
2. Evaluation includes chronological splits, baseline comparisons, MAE/RMSE and error analysis without future-data leakage.
3. The API rejects unsupported requests and handles missing models or data explicitly.
4. The dashboard displays actual source coverage, historical mode, units and timestamps; selections update the correct chart.
5. 3D interaction, keyboard access, loading/error states and the 2D/table fallback are checked on a documented reference device.
6. Source attribution, model limitations, screenshots and a short demonstration video accompany the submission.
7. The final report identifies implemented, partial and deferred capabilities separately.

GitHub commits will capture meaningful completed changes. The desired 20+ daily commits is a stretch preference, not an assessment metric; progress will be demonstrated through working functionality, reviewable changes and verification evidence.

## Risks and mitigation

| Risk | Mitigation and decision |
| --- | --- |
| Four predictive outputs exceed available data/time | Request mentor agreement on the core scope by 26 Nov; if all four are mandatory, reassess data access and feasibility immediately |
| Volume confused with congestion | Treat speed-based congestion as a separate task with appropriate labels |
| Attractive 3D interface delays the model | Complete baseline/API integration before elaborate map effects; omit custom 3D assets |
| Misleading evaluation | Use chronological splits and issue-time features; publish baseline and test results |
| Deployment or connectivity failure | Keep a reproducible local demonstration and recorded demo available |
| Commercial expectations distract from submission | Defer billing, sales commitments and paid data integrations until after mentor-reviewed delivery |

## Mentor feedback requested

- Is the proposed core scope acceptable for this internship, or must all four predictive capabilities be implemented within the month?
- Is a public historical US dataset acceptable, or is an Indian city/local dataset mandatory?
- Are there prescribed report templates, required algorithms, hosting requirements or assessment criteria?
- Can reviews be held at the end of each week, with final feedback on 20 December?

## Expected submission

The planned submission consists of the source repository, reproducible setup instructions, data and model documentation, evaluation results, backend API, interactive 3D dashboard, final project report, and a short demonstration video. Deployment status and any unimplemented original requirements will be stated explicitly.

The immediate next steps are mentor scope review, detailed error analysis, target-device checks and a hosting decision. Local account creation, cookie-backed sign-in and sign-out work, while email verification, password recovery and production deployment remain pending. The core forecasts remain accessible through an explicitly labeled public demo.
