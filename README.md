# FlowCast

FlowCast is an internship project for forecasting hourly traffic volume and presenting the result in an interactive 3D traffic dashboard. The first release uses the UCI Metro Interstate Traffic Volume dataset and predicts traffic one hour ahead for the represented I-94 corridor.

## Current milestone

The active one-month build runs from 23 November to 23 December 2026. The committed core includes:

- a reproducible data pipeline with chronological evaluation;
- persistence and weekly seasonal baselines;
- a gradient boosting traffic-volume model;
- a FastAPI inference service;
- a React and MapLibre dashboard with historical mode clearly labeled.

Congestion, travel-time, accident-risk, and live-city claims require additional matching datasets. See [the mentor report](MENTOR_REVIEW_REPORT.md) and [roadmap](ROADMAP.md) for scope and review points.

## Local setup

Requirements: Python 3.11 or later and Node.js 20 or later.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m ml.download_data
python -m ml.train
uvicorn api.main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The API documentation is available at `http://localhost:8000/docs` and the dashboard at `http://localhost:5173`.

## Verification

```bash
pytest
ruff check .
cd frontend && npm run check && npm run build
```

## Data source

The project uses [Metro Interstate Traffic Volume](https://archive.ics.uci.edu/dataset/492/metro+interstate+traffic+volume), donated by John Hogue to the UCI Machine Learning Repository. It contains hourly westbound I-94 traffic-volume observations for Minneapolis–St Paul from 2012–2018 with weather and holiday attributes. The dataset is licensed under CC BY 4.0.

The demo represents that historical corridor and period. It does not represent live or local Indian traffic.
