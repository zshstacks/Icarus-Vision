import type { Map, GeoJSONSource } from "maplibre-gl";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";
import { useEffect, useMemo } from "react";

interface TrackLayerState {
  map: Map | null;
}

export default function TrackLayer({ map }: TrackLayerState) {
  const track = useSelector((state: RootState) => state.tracks.tracks);

  const arr = useMemo(() => Object.values(track), [track]);

  useEffect(() => {
    if (!map) return;

    if (map.getSource("tracks")) return;

    map.addSource("tracks", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    map.addLayer({
      id: "tracks-layer",
      type: "circle",
      source: "tracks",
      paint: {
        "circle-radius": 6,
        "circle-color": "#ff0000",
      },
    });
  }, [map]);

  useEffect(() => {
    if (!map) return;

    // console.log("setData", arr.length);

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

    const source = map.getSource("tracks");
    if (source) {
      (source as GeoJSONSource).setData({
        type: "FeatureCollection",
        features,
      });
    }
  }, [arr, map]);

  if (!map) return null;
}
