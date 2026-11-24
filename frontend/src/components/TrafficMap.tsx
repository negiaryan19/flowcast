import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Forecast, HistoryPoint } from "../types";
import { Icon } from "./Icons";
import { number, sourceTime } from "../lib/format";
maplibregl.setWorkerUrl(mapWorkerUrl);
type Props = {
  forecast: Forecast;
  point?: HistoryPoint;
  default3D: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
};
export function TrafficMap({
  forecast,
  point,
  default3D,
  reducedMotion,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<maplibregl.Map | null>(null),
    onSelectRef = useRef(onSelect);
  const [threeD, setThreeD] = useState(default3D),
    [buildings, setBuildings] = useState(true),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  onSelectRef.current = onSelect;
  useEffect(() => {
    if (!container.current) return;
    setReady(false);
    setError("");
    setThreeD(default3D);
    let map: maplibregl.Map;
    let disposed = false;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: [forecast.location.longitude, forecast.location.latitude],
        zoom: 14.4,
        pitch: default3D ? 55 : 0,
        bearing: -22,
        canvasContextAttributes: { antialias: true },
        attributionControl: false,
      });
    } catch {
      setError(
        "3D rendering is unavailable on this device. Your forecast and history remain available below.",
      );
      return;
    }
    mapRef.current = map;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    const marker = document.createElement("button");
    marker.className = "sensor-marker";
    marker.type = "button";
    marker.setAttribute("aria-label", "Select I-94 forecast location");
    const inner = document.createElement("span");
    marker.append(inner);
    marker.addEventListener("click", () => onSelectRef.current());
    new maplibregl.Marker({ element: marker })
      .setLngLat([forecast.location.longitude, forecast.location.latitude])
      .addTo(map);
    const timeout = setTimeout(() => {
      if (!disposed && !map.isStyleLoaded())
        setError(
          "Map tiles are taking longer than expected. Check your connection; the forecast is still available.",
        );
    }, 15000);
    map.on("load", () => {
      if (disposed) return;
      clearTimeout(timeout);
      setReady(true);
      setError("");
      // Road colors are geographic styling, not measured congestion levels.
      const roadColors: Record<string, string> = {
        highway_minor: "#465347",
        highway_major_inner: "#738166",
        highway_major_subtle: "#738166",
        highway_motorway_inner: "#b8ce83",
        highway_motorway_subtle: "#b8ce83",
      };
      for (const [id, color] of Object.entries(roadColors)) {
        if (map.getLayer(id)) map.setPaintProperty(id, "line-color", color);
      }
      if (map.getLayer("background"))
        map.setPaintProperty("background", "background-color", "#17231e");
      if (map.getLayer("water"))
        map.setPaintProperty("water", "fill-color", "#122d2c");
      if (map.getLayer("landcover_wood"))
        map.setPaintProperty("landcover_wood", "fill-pattern", undefined);
      const label = map
        .getStyle()
        .layers.find(
          (l) => l.type === "symbol" && "text-field" in (l.layout ?? {}),
        );
      if (!map.getSource("flowcast-buildings"))
        map.addSource("flowcast-buildings", {
          type: "vector",
          url: "https://tiles.openfreemap.org/planet",
        });
      map.addLayer(
        {
          id: "flowcast-3d",
          source: "flowcast-buildings",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 13,
          layout: { visibility: buildings ? "visible" : "none" },
          filter: ["!=", ["get", "hide_3d"], true],
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["coalesce", ["get", "render_height"], 0],
              0,
              "#374339",
              200,
              "#6d8061",
            ],
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
            "fill-extrusion-base": [
              "coalesce",
              ["get", "render_min_height"],
              0,
            ],
            "fill-extrusion-opacity": 0.86,
          },
        },
        label?.id,
      );
    });
    map.on("error", () => {
      if (!disposed && !map.isStyleLoaded())
        setError(
          "The basemap could not load. Check your connection or continue with forecast history.",
        );
    });
    return () => {
      disposed = true;
      clearTimeout(timeout);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [forecast.location.latitude, forecast.location.longitude, default3D]);
  useEffect(() => {
    const map = mapRef.current;
    if (map && ready && map.getLayer("flowcast-3d"))
      map.setLayoutProperty(
        "flowcast-3d",
        "visibility",
        buildings ? "visible" : "none",
      );
  }, [buildings, ready]);
  function tilt() {
    const next = !threeD;
    setThreeD(next);
    mapRef.current?.easeTo({
      pitch: next ? 55 : 0,
      bearing: next ? -22 : 0,
      duration: reducedMotion ? 0 : 700,
    });
  }
  function recenter() {
    mapRef.current?.easeTo({
      center: [forecast.location.longitude, forecast.location.latitude],
      zoom: 14.4,
      pitch: threeD ? 55 : 0,
      duration: reducedMotion ? 0 : 700,
    });
  }
  return (
    <div className="map-shell">
      <div className="map-canvas" ref={container} />
      <div className="map-top">
        <span className="map-mode">
          <i /> HISTORICAL EXPLORER
        </span>
        <div className="map-view-switch">
          <button
            className={!threeD ? "selected" : ""}
            onClick={() => {
              if (threeD) tilt();
            }}
          >
            2D
          </button>
          <button
            className={threeD ? "selected" : ""}
            onClick={() => {
              if (!threeD) tilt();
            }}
          >
            3D
          </button>
        </div>
      </div>
      <div className="map-tools">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() =>
            mapRef.current?.zoomIn({ duration: reducedMotion ? 0 : 300 })
          }
        >
          <Icon name="plus" />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() =>
            mapRef.current?.zoomOut({ duration: reducedMotion ? 0 : 300 })
          }
        >
          <Icon name="minus" />
        </button>
        <span />
        <button
          title="Recenter map"
          aria-label="Recenter map"
          onClick={recenter}
        >
          <Icon name="target" />
        </button>
        <button
          title="Toggle buildings"
          aria-label="Toggle buildings"
          aria-pressed={buildings}
          onClick={() => setBuildings(!buildings)}
        >
          <Icon name="layers" />
        </button>
      </div>
      {error && (
        <div className="map-error" role="status">
          <Icon name="map" />
          <p>{error}</p>
        </div>
      )}
      <button className="map-sensor-card" onClick={onSelect}>
        <span className="sensor-id">
          I-94 <i /> ATR 301
        </span>
        <strong>
          {number(point?.predicted ?? forecast.predicted_volume)}{" "}
          <small>veh/h</small>
        </strong>
        <span>Westbound · +1h forecast</span>
        {point && (
          <small>{sourceTime(point.timestamp)} source local time</small>
        )}
      </button>
      <div className="map-bottom">
        <span>
          <span className="map-key" /> Forecast location
        </span>
        <span>Approximate display anchor</span>
      </div>
    </div>
  );
}
