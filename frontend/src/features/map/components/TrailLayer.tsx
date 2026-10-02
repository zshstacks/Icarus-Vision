import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { GeoJSONSource, Map } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";
import type { RootState } from "../../../redux/store";
import api from "../../../redux/api";

const SOURCE_ID = "trail";
const LAYER_ID = "trail-layer";

const EMPTY: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const REFETCH_MS = 30_000;

interface Props {
  map: Map | null;
}

export default function TrailLayer({ map }: Props) {
  const selectedId = useSelector((s: RootState) => s.selection.id);
  const trailMinutes = useSelector((s: RootState) => s.selection.trailMinutes);

  const livePos = useSelector((s: RootState) => {
    if (!s.selection.id) return null;
    const t = s.tracks.tracks[s.selection.id];
    return t ? { lon: t.lon, lat: t.lat } : null;
  });

  const [rawTrail, setRawTrail] = useState<FeatureCollection>(EMPTY);

  useEffect(() => {
    if (!selectedId) {
      setRawTrail(EMPTY);
      return;
    }

    let cancelled = false;

    const fetchTrail = () => {
      api
        .get<FeatureCollection>(
          `/api/tracks/${encodeURIComponent(selectedId)}/history?minutes=${trailMinutes}`,
        )
        .then((res) => {
          if (!cancelled) setRawTrail(res.data);
        })
        .catch((err) => {
          if (!cancelled) console.warn("[TrailLayer] fetch failed:", err);
        });
    };

    fetchTrail();
    const intervalId = setInterval(fetchTrail, REFETCH_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedId, trailMinutes]);

  const merged = useMemo<FeatureCollection>(() => {
    if (!livePos) return EMPTY;
    if (rawTrail.features.length === 0) return EMPTY;

    const line = rawTrail.features[0] as Feature<LineString>;
    const coords = line.geometry.coordinates.slice();

    const last = coords[coords.length - 1];
    const isDuplicate =
      last && last[0] === livePos.lon && last[1] === livePos.lat;

    if (!isDuplicate) {
      coords.push([livePos.lon, livePos.lat]);
    }

    if (coords.length < 2) return EMPTY;

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: line.properties ?? {},
        },
      ],
    };
  }, [rawTrail, livePos]);

  useEffect(() => {
    if (!map) return;
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: EMPTY,
      lineMetrics: true,
    });

    map.addLayer({
      id: LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          1.5,
          8,
          2.5,
          14,
          4,
        ],
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "rgba(88, 166, 255, 0)",
          0.08,
          "rgba(88, 166, 255, 0.45)",
          1,
          "rgba(88, 166, 255, 0.9)",
        ],
      },
    });
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(merged);
  }, [merged, map]);

  return null;
}
