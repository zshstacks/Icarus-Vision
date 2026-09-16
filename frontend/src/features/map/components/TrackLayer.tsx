import type { Map, GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { Popup } from "maplibre-gl";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../redux/store";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackSelected } from "../../../redux/selectSlice/selectSlice";

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
  const selectedId = useSelector((state: RootState) => state.selection.id);
  const arr = useMemo(() => Object.values(track), [track]);
  const dispatch: AppDispatch = useDispatch();

  //track geojson source + layer have been added
  const [sourceReady, setSourceReady] = useState(false);

  const prevSelectedIdRef = useRef<string | null>(null);
  const prevHoveredIdRef = useRef<string | null>(null);

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // popup instances
  const hoverPopupRef = useRef<Popup | null>(null);
  const selectedPopupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map) return;
    if (map.getSource(SOURCE_ID)) {
      setSourceReady(true);
      return;
    }

    let cancelled = false;

    loadAircraftIcon(map)
      .then(() => {
        if (cancelled) return;

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          promoteId: "id",
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
            "icon-color": [
              "case",
              [
                "any",
                ["boolean", ["feature-state", "hover"], false],
                ["boolean", ["feature-state", "selected"], false],
              ],
              "#F2C94C", //hover or selected
              "#D5DEE6", // default
            ],
            "icon-opacity": 1,
          },
        });

        //to select the needed plane
        map.on("click", LAYER_ID, (e) => {
          const feature = e.features?.[0];
          if (feature?.properties?.id != null) {
            dispatch(trackSelected(String(feature.properties.id)));
          }
        });
        //to deselect plane
        map.on("click", (e) => {
          const hits = map.queryRenderedFeatures(e.point, {
            layers: [LAYER_ID],
          });
          if (hits.length === 0) {
            dispatch(trackSelected(null));
          }
        });

        setSourceReady(true);
      })
      .catch((err) => {
        console.error("[TrackLayer] failed to load aircraft icon:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [map, dispatch]);

  //push data whenevenr arr changes or when the source becomes ready
  useEffect(() => {
    if (!map || !sourceReady) return;

    const features = arr.map((t) => ({
      type: "Feature" as const,
      id: t.id,
      geometry: {
        type: "Point" as const,
        coordinates: [t.lon, t.lat],
      },
      properties: {
        id: t.id,
        callsign: t.callsign,
        altitude: t.altitude,
        on_ground: t.on_ground,
        speed: t.speed,
        heading: t.heading,
        vertical_rate: t.vertical_rate,
        timestamp: t.timestamp,
      },
    }));

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features,
      });
    }
  }, [arr, map, sourceReady]);

  //sync selected feature state from redux
  useEffect(() => {
    if (!map || !sourceReady) return;

    const prevId = prevSelectedIdRef.current;

    if (prevId != null && prevId !== selectedId) {
      map.setFeatureState(
        { source: SOURCE_ID, id: prevId },
        { selected: false },
      );
    }

    if (selectedId != null) {
      map.setFeatureState(
        { source: SOURCE_ID, id: selectedId },
        { selected: true },
      );
    }

    prevSelectedIdRef.current = selectedId;
  }, [selectedId, map, sourceReady]);

  // selected popup tracks position across ws ticks
  useEffect(() => {
    if (!map || !sourceReady) return;

    // nothing selected - remove popup
    if (selectedId == null) {
      if (selectedPopupRef.current) {
        selectedPopupRef.current.remove();
        selectedPopupRef.current = null;
      }
      return;
    }

    const selectedTrack = track[selectedId];
    if (!selectedTrack) {
      // track was removed while still selected
      if (selectedPopupRef.current) {
        selectedPopupRef.current.remove();
        selectedPopupRef.current = null;
      }
      return;
    }

    const coords: [number, number] = [selectedTrack.lon, selectedTrack.lat];
    const callsign = selectedTrack.callsign || "N/A";

    if (!selectedPopupRef.current) {
      selectedPopupRef.current = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 20,
        className: "track-popup",
        maxWidth: "none",
      });
    }

    selectedPopupRef.current
      .setLngLat(coords)
      .setHTML(`<div class="track-popup-inner">${callsign}</div>`)
      .addTo(map);
  }, [selectedId, track, map, sourceReady]);

  // hover feature state and hover popup
  useEffect(() => {
    if (!map || !sourceReady) return;

    const ensureHoverPopup = () => {
      if (!hoverPopupRef.current) {
        hoverPopupRef.current = new Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 20,
          className: "track-popup",
          maxWidth: "none",
        });
      }
      return hoverPopupRef.current;
    };

    const removeHoverPopup = () => {
      if (hoverPopupRef.current) {
        hoverPopupRef.current.remove();
      }
    };

    const onMouseMove = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const id =
        feature?.properties?.id != null ? String(feature.properties.id) : null;

      const prevId = prevHoveredIdRef.current;

      // feature state hover
      if (id !== prevId) {
        if (prevId != null) {
          map.setFeatureState(
            { source: SOURCE_ID, id: prevId },
            { hover: false },
          );
        }
        if (id != null) {
          map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
        }
        prevHoveredIdRef.current = id;
      }

      if (id == null) {
        removeHoverPopup();
        return;
      }

      if (id === selectedIdRef.current) {
        removeHoverPopup();
        return;
      }

      const geometry = feature!.geometry as {
        type: string;
        coordinates: [number, number];
      };
      const coords = geometry.coordinates;
      const callsign =
        (feature!.properties?.callsign as string | undefined) || "N/A";

      const popup = ensureHoverPopup();
      popup
        .setLngLat(coords)
        .setHTML(`<div class="track-popup-inner">${callsign}</div>`)
        .addTo(map);
    };

    const onMouseLeave = () => {
      const prevId = prevHoveredIdRef.current;
      if (prevId != null) {
        map.setFeatureState(
          { source: SOURCE_ID, id: prevId },
          { hover: false },
        );
        prevHoveredIdRef.current = null;
      }
      removeHoverPopup();
    };

    map.on("mousemove", LAYER_ID, onMouseMove);
    map.on("mouseleave", LAYER_ID, onMouseLeave);

    return () => {
      map.off("mousemove", LAYER_ID, onMouseMove);
      map.off("mouseleave", LAYER_ID, onMouseLeave);

      if (prevHoveredIdRef.current != null) {
        map.setFeatureState(
          { source: SOURCE_ID, id: prevHoveredIdRef.current },
          { hover: false },
        );
        prevHoveredIdRef.current = null;
      }
      removeHoverPopup();
      hoverPopupRef.current = null;
    };
  }, [map, sourceReady]);

  // clean up selected popup on unmount
  useEffect(() => {
    return () => {
      if (selectedPopupRef.current) {
        selectedPopupRef.current.remove();
        selectedPopupRef.current = null;
      }
    };
  }, []);

  if (!map) return null;
  return null;
}
