import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

import type { Forecast } from "../types";

type Props = { forecast: Forecast };

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export function TrafficMap({ forecast }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const { longitude, latitude, name } = forecast.location;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [longitude, latitude],
      zoom: 14.2,
      pitch: 57,
      bearing: -22,
      canvasContextAttributes: { antialias: true },
      attributionControl: false
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const markerElement = document.createElement("button");
    markerElement.className = "sensor-marker";
    markerElement.type = "button";
    markerElement.setAttribute("aria-label", `Select ${name}`);
    markerElement.innerHTML = `<span></span>`;

    const popupContent = document.createElement("div");
    popupContent.className = "map-popup";
    const popupTitle = document.createElement("strong");
    popupTitle.textContent = name;
    const popupValue = document.createElement("span");
    popupValue.textContent = `${Math.round(forecast.predicted_volume).toLocaleString()} vehicles/hour`;
    const popupContext = document.createElement("small");
    popupContext.textContent = "Historical 1 hour forecast";
    popupContent.append(popupTitle, popupValue, popupContext);
    const popup = new maplibregl.Popup({ offset: 24, closeButton: false }).setDOMContent(
      popupContent
    );

    new maplibregl.Marker({ element: markerElement, anchor: "center" })
      .setLngLat([longitude, latitude])
      .setPopup(popup)
      .addTo(map);

    map.on("load", () => {
      const labelLayer = map.getStyle().layers.find(
        (layer) => layer.type === "symbol" && "text-field" in (layer.layout ?? {})
      );
      if (!map.getSource("openfreemap")) {
        map.addSource("openfreemap", {
          type: "vector",
          url: "https://tiles.openfreemap.org/planet"
        });
      }
      map.addLayer(
        {
          id: "flowcast-3d-buildings",
          source: "openfreemap",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 13,
          filter: ["!=", ["get", "hide_3d"], true],
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "render_height"],
              0,
              "#152d36",
              180,
              "#214754"
            ],
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.72
          }
        },
        labelLayer?.id
      );
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [forecast]);

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-overlay top-left">
        <span className="live-dot" /> Historical replay
      </div>
      <div className="map-overlay bottom-left">
        <span className="eyebrow">Selected corridor</span>
        <strong>{forecast.location.name}</strong>
        <small>{forecast.location.coordinate_note ?? forecast.location.region}</small>
      </div>
    </div>
  );
}
