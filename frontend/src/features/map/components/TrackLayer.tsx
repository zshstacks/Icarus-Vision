import type { Map, GeoJSONSource } from "maplibre-gl";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";
import { useEffect, useMemo } from "react";

interface TrackLayerState {
  map: Map | null;
}

const ICON_ID = "aircraft-icon";
const LAYER_ID = "tracks-layer";
const SOURCE_ID = "tracks";

const AIRCRAFT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <path fill="#000000" d="M32 4 L38 26 L58 38 L58 44 L38 36 L38 50 L46 58 L46 62 L32 56 L18 62 L18 58 L26 50 L26 36 L6 44 L6 38 L26 26 Z"/>
</svg>
`.trim();

function loadAircraftIcon(map: Map): Promise<void> {
  return new Promise((resolve, reject) => {
    if (map.hasImage(ICON_ID)) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (!map.hasImage(ICON_ID)) {
        map.addImage(ICON_ID, img, { sdf: true });
      }
      resolve();
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(AIRCRAFT_SVG)}`;
  });
}

export default function TrackLayer({ map }: TrackLayerState) {
  const track = useSelector((state: RootState) => state.tracks.tracks);
  const arr = useMemo(() => Object.values(track), [track]);

  useEffect(() => {
    if (!map) return;
    if (map.getSource(SOURCE_ID)) return;

    let cancelled = false;

    loadAircraftIcon(map)
      .then(() => {
        if (cancelled) return;

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            "icon-image": ICON_ID,
            "icon-size": 0.35,
            "icon-rotate": ["coalesce", ["get", "heading"], 0],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-padding": 2,
          },
          paint: {
            "icon-color": "#D5DEE6",
            "icon-opacity": 1,
          },
        });
      })
      .catch((err) => {
        console.error("[TrackLayer] failed to load aircraft icon:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const features = arr.map((track) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [track.lon, track.lat],
      },
      properties: {
        id: track.id,
        callsign: track.callsign,
        altitude: track.altitude,
        on_ground: track.on_ground,
        speed: track.speed,
        heading: track.heading,
        vertical_rate: track.vertical_rate,
        timestamp: track.timestamp,
      },
    }));

    const source = map.getSource(SOURCE_ID);
    if (source) {
      (source as GeoJSONSource).setData({
        type: "FeatureCollection",
        features,
      });
    }
  }, [arr, map]);

  if (!map) return null;
}
