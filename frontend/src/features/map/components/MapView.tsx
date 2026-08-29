import { useEffect, useRef, useState } from "react";
import { Map, type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import TrackLayer from "./TrackLayer";

const PALETTE = {
  //Core surfaces
  land: "#0D1117",
  water: "#080B10",

  //Borders
  borderCountry: "#484F58",
  borderState: "#30363D",

  //Buildings
  building: "#0D1117",
  buildingOutline: "#161B22",

  //Aeroway
  aerowayFill: "#1C2128",
  aerowayLine: "#30363D",

  //Roads / rail
  roadCasing: "#161B22",
  roadMinor: "#21262D",
  roadMajor: "#30363D",
  rail: "#21262D",

  //Labels
  labelMuted: "#8B949E", // country, state
  labelBright: "#E6EDF3", // city, capital, town
  labelFaint: "#6E7681", // "other" place class, water names, road/shield labels
  labelHalo: "rgba(8, 11, 16, 0.92)",
};

const HIDDEN_LAYERS = [
  "park",
  "park_outline",
  "landuse_residential",
  "landcover_wood",
  "landcover_grass",
  "landcover_ice",
  "landcover_wetland",
  "landcover_sand",
  "landuse_pitch",
  "landuse_track",
  "landuse_cemetery",
  "landuse_hospital",
  "landuse_school",
  "road_area_pattern",
  "road_one_way_arrow",
  "road_one_way_arrow_opposite",
  "road_major_rail_hatching",
  "road_transit_rail_hatching",
  "tunnel_major_rail_hatching",
  "tunnel_transit_rail_hatching",
  "bridge_major_rail_hatching",
  "bridge_transit_rail_hatching",
  "poi_r20",
  "poi_r7",
  "poi_r1",
  "poi_transit",
  "airport",
  "waterway_line_label",
  "label_village",
];

const MAJOR_ROAD_CLASSES = [
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
];

const COUNTRY_BORDER_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  2,
  0.5,
  6,
  0.9,
  12,
  1.4,
];
const STATE_BORDER_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  0.3,
  8,
  0.5,
  12,
  0.8,
];

type LabelTier = { color: string; haloWidth: number; opacity: number };
const LABEL_TIERS: Record<string, LabelTier> = {
  label_country_1: { color: PALETTE.labelMuted, haloWidth: 1.3, opacity: 0.85 },
  label_country_2: { color: PALETTE.labelMuted, haloWidth: 1.3, opacity: 0.85 },
  label_country_3: { color: PALETTE.labelMuted, haloWidth: 1.1, opacity: 0.75 },
  label_state: { color: PALETTE.labelMuted, haloWidth: 1.1, opacity: 0.75 },
  label_city_capital: {
    color: PALETTE.labelBright,
    haloWidth: 1.5,
    opacity: 0.95,
  },
  label_city: { color: PALETTE.labelBright, haloWidth: 1.4, opacity: 0.9 },
  label_town: { color: PALETTE.labelBright, haloWidth: 1.2, opacity: 0.75 },
  label_other: { color: PALETTE.labelFaint, haloWidth: 1, opacity: 0.5 },
  water_name_point_label: {
    color: PALETTE.labelFaint,
    haloWidth: 1,
    opacity: 0.55,
  },
  water_name_line_label: {
    color: PALETTE.labelFaint,
    haloWidth: 1,
    opacity: 0.55,
  },
};

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = new Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-74.5, 42.5],
      zoom: 5.8,
      fadeDuration: 80,
      attributionControl: false,
    });

    mapInstance.on("load", () => {
      applyIcarusTheme(mapInstance);
      mapInstance.resize();
      setMap(mapInstance);
      (window as any).__map = mapInstance;
    });

    mapInstance.on("styledata", () => {
      if (mapInstance.isStyleLoaded()) applyIcarusTheme(mapInstance);
    });

    return () => mapInstance.remove();
  }, []);

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full"
      style={{ minHeight: 0, backgroundColor: PALETTE.land }}
    >
      <TrackLayer map={map} />
    </div>
  );
}

function applyIcarusTheme(map: Map) {
  const layers = map.getStyle().layers ?? [];
  const layerIds = new Set(layers.map((l) => l.id));
  const has = (id: string) => layerIds.has(id);

  //Base surfaces
  map.setPaintProperty("background", "background-color", PALETTE.land);
  if (has("water")) map.setPaintProperty("water", "fill-color", PALETTE.water);

  if (has("natural_earth")) {
    map.setPaintProperty("natural_earth", "raster-opacity", 0.1);
    map.setPaintProperty("natural_earth", "raster-saturation", -1);
    map.setPaintProperty("natural_earth", "raster-contrast", -0.4);
    map.setPaintProperty("natural_earth", "raster-brightness-min", 0);
    map.setPaintProperty("natural_earth", "raster-brightness-max", 0.22);
  }

  //Buildings
  if (has("building")) {
    map.setPaintProperty("building", "fill-color", PALETTE.building);
    map.setPaintProperty("building", "fill-opacity", 0.6);
    map.setPaintProperty(
      "building",
      "fill-outline-color",
      PALETTE.buildingOutline,
    );
  }
  if (has("building-3d")) {
    map.setPaintProperty(
      "building-3d",
      "fill-extrusion-color",
      PALETTE.building,
    );
    map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.5);
  }

  //Aeroway
  if (has("aeroway_fill")) {
    map.setPaintProperty("aeroway_fill", "fill-color", PALETTE.aerowayFill);
    map.setPaintProperty("aeroway_fill", "fill-opacity", 0.5);
  }
  for (const id of ["aeroway_runway", "aeroway_taxiway"]) {
    if (!has(id)) continue;
    map.setPaintProperty(id, "line-color", PALETTE.aerowayLine);
    map.setPaintProperty(id, "line-opacity", 0.6);
  }

  //Boundaries
  if (has("boundary_2")) {
    map.setPaintProperty("boundary_2", "line-color", PALETTE.borderCountry);
    map.setPaintProperty("boundary_2", "line-width", COUNTRY_BORDER_WIDTH);
    map.setPaintProperty("boundary_2", "line-opacity", 0.6);
    map.setPaintProperty("boundary_2", "line-blur", 0.3);
  }
  for (const id of ["boundary_3", "boundary_disputed"]) {
    if (!has(id)) continue;
    map.setPaintProperty(id, "line-color", PALETTE.borderState);
    map.setPaintProperty(id, "line-width", STATE_BORDER_WIDTH);
    map.setPaintProperty(id, "line-opacity", 0.45);
    map.setPaintProperty(id, "line-blur", 0.3);
  }

  //Fully hidden: landcover texture, rail hatching, POI, one-way arrows
  for (const id of HIDDEN_LAYERS) {
    if (has(id)) map.setLayoutProperty(id, "visibility", "none");
  }

  //Rivers / minor waterways
  for (const id of ["waterway_river", "waterway_other", "waterway_tunnel"]) {
    if (!has(id)) continue;
    map.setPaintProperty(id, "line-color", PALETTE.water);
    map.setPaintProperty(id, "line-opacity", 0.6);
  }

  //Roads, rail, tunnels, bridges
  for (const layer of layers) {
    if (layer.type !== "line") continue;
    const id = layer.id;
    const isRoadFamily =
      id.startsWith("road_") ||
      id.startsWith("tunnel_") ||
      id.startsWith("bridge_");
    if (!isRoadFamily) continue;

    const isRail = id.includes("rail");
    const isCasing = id.includes("casing");
    const isMajor = MAJOR_ROAD_CLASSES.some((cls) => id.includes(cls));

    if (isRail) {
      map.setPaintProperty(id, "line-color", PALETTE.rail);
      map.setPaintProperty(id, "line-opacity", 0.2);
      continue;
    }
    if (isCasing) {
      map.setPaintProperty(id, "line-color", PALETTE.roadCasing);
      map.setPaintProperty(id, "line-opacity", 0.08);
      continue;
    }
    map.setPaintProperty(
      id,
      "line-color",
      isMajor ? PALETTE.roadMajor : PALETTE.roadMinor,
    );
    map.setPaintProperty(id, "line-opacity", isMajor ? 0.35 : 0.18);
  }

  //Road name labels & route shields
  for (const id of [
    "highway-name-path",
    "highway-name-minor",
    "highway-name-major",
  ]) {
    if (!has(id)) continue;
    map.setPaintProperty(id, "text-color", PALETTE.labelFaint);
    map.setPaintProperty(id, "text-halo-color", PALETTE.labelHalo);
    map.setPaintProperty(id, "text-halo-width", 1);
    map.setPaintProperty(id, "text-opacity", 0.5);
  }
  for (const id of [
    "highway-shield-non-us",
    "highway-shield-us-interstate",
    "road_shield_us",
  ]) {
    if (!has(id)) continue;

    map.setLayoutProperty(id, "icon-image", "");
    map.setPaintProperty(id, "text-color", PALETTE.labelFaint);
    map.setPaintProperty(id, "text-opacity", 0.5);
  }

  //Place / water-name labels
  for (const [id, tier] of Object.entries(LABEL_TIERS)) {
    if (!has(id)) continue;
    map.setPaintProperty(id, "text-color", tier.color);
    map.setPaintProperty(id, "text-halo-color", PALETTE.labelHalo);
    map.setPaintProperty(id, "text-halo-width", tier.haloWidth);
    map.setPaintProperty(id, "text-opacity", tier.opacity);
    map.setPaintProperty(id, "icon-opacity", 0);
  }
}
