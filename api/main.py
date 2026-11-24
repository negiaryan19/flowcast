"""FlowCast HTTP API for model metadata and historical forecast demonstration."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.auth import router as auth_router
from ml.data import FEATURE_COLUMNS

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = ROOT / "artifacts" / "traffic_volume_1h.joblib"


class HealthResponse(BaseModel):
    status: str
    model_ready: bool
    detail: str | None = None


class Location(BaseModel):
    id: str
    name: str
    region: str
    latitude: float
    longitude: float
    coordinate_note: str | None = None


class ForecastResponse(BaseModel):
    location: Location
    issue_time: str
    target_time: str
    horizon_hours: int
    predicted_volume: float = Field(ge=0)
    units: str
    model_version: str
    model_name: str
    data_mode: str
    source: str


class HistoryPoint(BaseModel):
    timestamp: str
    actual: float = Field(ge=0)
    predicted: float = Field(ge=0)


class ModelStore:
    def __init__(self, path: Path | None = None) -> None:
        configured = os.getenv("FLOWCAST_MODEL_PATH")
        self.path = path or (Path(configured) if configured else DEFAULT_MODEL_PATH)
        self.artifact: dict[str, Any] | None = None
        self.error: str | None = None

    def load(self) -> None:
        try:
            loaded = joblib.load(self.path)
            required = {
                "schema_version",
                "champion",
                "location",
                "latest_features",
                "history",
            }
            missing = required - set(loaded)
            if missing:
                raise ValueError(f"Model artifact is missing fields: {sorted(missing)}")
            self.artifact = loaded
            self.error = None
        except (FileNotFoundError, OSError, ValueError, KeyError) as exc:
            self.artifact = None
            self.error = str(exc)

    def require(self) -> dict[str, Any]:
        if self.artifact is None:
            self.load()
        if self.artifact is None:
            raise HTTPException(
                status_code=503,
                detail=f"Forecast model is unavailable: {self.error or 'unknown error'}",
            )
        return self.artifact


store = ModelStore()


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.load()
    yield


app = FastAPI(
    title="FlowCast API",
    version="0.3.0",
    description="Historical one-hour traffic-volume forecast demonstration.",
    lifespan=lifespan,
)

app.include_router(auth_router)

origins = [
    origin.strip()
    for origin in os.getenv("FLOWCAST_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    """Apply safe defaults to API and documentation responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    if store.artifact is not None:
        return HealthResponse(status="ok", model_ready=True)
    store.load()
    if store.artifact is not None:
        return HealthResponse(status="ok", model_ready=True)
    return HealthResponse(status="degraded", model_ready=False, detail=store.error)


@app.get("/api/v1/model")
def model_metadata() -> dict[str, Any]:
    artifact = store.require()
    return {
        "model_version": artifact["model_version"],
        "model_name": artifact["champion"],
        "horizon_hours": artifact["horizon_hours"],
        "target": artifact["target"],
        "units": artifact["units"],
        "data_mode": artifact["data_mode"],
        "source": artifact["source"],
        "source_period": artifact["source_period"],
        "location": artifact["location"],
        "evaluation": artifact["evaluation"],
        "feature_count": len(artifact["feature_columns"]),
        "evaluation_periods": artifact.get("evaluation_periods", {}),
        "row_counts": artifact.get("row_counts", {}),
        "error_analysis": artifact.get("error_analysis", {}),
    }


@app.get("/api/v1/forecast/latest", response_model=ForecastResponse)
def latest_forecast() -> ForecastResponse:
    artifact = store.require()
    champion = artifact["champion"]
    if champion == "gradient_boosting":
        row = pd.DataFrame([artifact["latest_features"]], columns=FEATURE_COLUMNS)
        prediction = float(artifact["model"].predict(row)[0])
    else:
        prediction = float(artifact["latest_baselines"][champion])

    return ForecastResponse(
        location=Location(**artifact["location"]),
        issue_time=artifact["latest_issue_time"],
        target_time=artifact["latest_target_time"],
        horizon_hours=artifact["horizon_hours"],
        predicted_volume=max(0.0, round(prediction, 1)),
        units=artifact["units"],
        model_version=artifact["model_version"],
        model_name=champion,
        data_mode=artifact["data_mode"],
        source=artifact["source"],
    )


@app.get("/api/v1/history", response_model=list[HistoryPoint])
def history(limit: int = 48) -> list[HistoryPoint]:
    if not 1 <= limit <= 72:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 72")
    artifact = store.require()
    return [HistoryPoint(**point) for point in artifact["history"][-limit:]]
