# FlowCast internship project review report

**Organization:** Intermo  
**Project:** FlowCast — AI-Powered Smart Traffic Flow Prediction Platform  
**Report date:** 23 November 2026  
**Proposed project period:** 23 November–23 December 2026  
**Report type:** Initial progress report and implementation proposal  
**Repository:** [negiaryan19/flowcast](https://github.com/negiaryan19/flowcast)

## Project summary

FlowCast aims to help users understand traffic patterns and anticipate changes through machine learning and an interactive 3D dashboard. The original brief covers traffic volume, congestion, travel time, and accident risk using traffic, weather, and calendar data.

For the one-month internship delivery, the proposed core is a reproducible traffic-volume forecasting system, a backend prediction API, and a 3D map interface displaying historical observations and forecasts. Congestion and travel-time estimation are conditional extensions. Validated accident-risk prediction is proposed as future work because it requires additional matched collision and traffic-exposure data. This narrower scope is submitted for mentor review, rather than presented as an approved change to the brief.

## Current progress

The repository has been initialized and the initial research and delivery roadmap have been prepared. The local inspection on 23 November found two existing commits and empty README, dependency, API, dashboard, and utility files. There is currently no implemented model, running application, test suite, or deployment in the inspected checkout.

| Work area | Current status | Next deliverable |
| --- | --- | --- |
| Scope and planning | Initial research and one-month plan prepared | Mentor feedback on scope |
| Data | Candidate public sources identified | Download, quality audit, dataset documentation |
| Machine learning | Not implemented | Baselines and chronological evaluation |
| Backend | Empty starter file | Forecast API with input validation |
| Frontend | Empty starter file | React dashboard with interactive 3D map |
| Testing and deployment | Not implemented | Automated checks and reproducible demonstration |

No accuracy, response-time, business-impact, or revenue results have been measured yet. All performance criteria below are planned targets.

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

The proposed starter source is [UCI Metro Interstate Traffic Volume](https://archive.ics.uci.edu/dataset/492/metro+interstate+traffic+volume), which contains historical hourly traffic with weather and holiday features for an I-94 corridor in Minnesota. It supports a volume experiment, not a claim of local Indian-road performance or citywide coverage. Attribution will be retained.

The pipeline will audit data quality, resolve repeated timestamps, generate lagged traffic and calendar features, and divide data chronologically into training, validation, and final test periods. Preprocessing will be fitted on training data only. Forecasts will use information available at their issue time; future observed traffic and target-hour observed weather will not be used as if known in advance.

Persistence and same-hour-last-week predictions will establish reference performance. A gradient boosting model will then be compared using mean absolute error (MAE) and root mean squared error (RMSE), including peak-hour error analysis. The final test period will remain untouched during model selection. If the learned model does not outperform the baseline, the result will be reported honestly and the stronger method will remain available.

The proposed improvement target is at least 10% lower validation MAE than the stronger baseline. This is an experiment target, not a promised outcome or a requirement to suppress unfavorable results. Forecast intervals will be shown only if calibrated and evaluated.

## Technical design and 3D experience

| Layer | Proposed technology and responsibility |
| --- | --- |
| Data and modeling | Python, pandas and scikit-learn for cleaning, features, training and evaluation |
| Backend | FastAPI for input validation and inference using a versioned model artifact |
| Frontend | React, TypeScript and Vite for controls, charts and dashboard layout |
| 3D mapping | MapLibre GL JS for map interaction and available building extrusion |
| Storage | Local dataset/model files initially; additional database infrastructure only if justified |
| Verification | Python tests, frontend type checking/build, API integration checks and browser checks |

Data will flow from ingestion and validation to feature generation, model training, evaluation, saved artifact, API, and dashboard. Training will remain separate from API requests.

The user will select the represented location and historical time, view an observed-versus-predicted chart, and inspect the forecast's units, horizon and provenance. The map will show the geography supported by the dataset. A single corridor model will not be presented as forecasting every road in a city.

The frontend will use a dark, readable visual theme with a tilted map and restrained 3D buildings where suitable geometry is available. A 2D/table alternative will support devices without usable WebGL. Any later animated vehicles will be labeled simulated unless based on actual permitted trajectories. [MapLibre's building example](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/) establishes the proposed rendering approach.

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

The immediate next step is scope review alongside repository setup and data preparation. Development can begin on the core pipeline while the mentor considers the conditional requirements.
