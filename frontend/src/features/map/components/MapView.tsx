import { useEffect, useRef } from "react";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const PALETTE = {
  land: "#0D1117",
  landAlt: "#161B22",
  water: "#0A0E14",
  waterOutline: "#1F2428",
  border: "#30363D",
  borderProminent: "#484F58",
  label: "#8B949E",
  labelProminent: "#C9D1D9",
  labelHalo: "rgba(13, 17, 23, 0.9)",
  road: "#21262D",
  roadMajor: "#30363D",
  building: "#0D1117",
  buildingOutline: "#161B22",
};

function applyIcarusTheme(map: Map) {
  //Background
  if (map.getLayer("background")) {
    map.setPaintProperty("background", "background-color", PALETTE.land);
  }

  //  Water
  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", PALETTE.water);
    map.setPaintProperty("water", "fill-outline-color", PALETTE.waterOutline);
  }
  if (map.getLayer("waterway")) {
    map.setPaintProperty("waterway", "line-color", PALETTE.water);
  }

  // Landcover
  const landcoverIds = [
    "landcover_ice_shelf",
    "landcover_glacier",
    "landuse_residential",
    "landcover_wood",
    "landuse_park",
  ];

  landcoverIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.setPaintProperty(id, "fill-color", PALETTE.landAlt);
      map.setPaintProperty(id, "fill-opacity", 0.7);
    }
  });

  //Buildings
  if (map.getLayer("building")) {
    map.setPaintProperty("building", "fill-color", PALETTE.building);
    map.setPaintProperty(
      "building",
      "fill-outline-color",
      PALETTE.buildingOutline,
    );
  }
  if (map.getLayer("building-extrusion")) {
    map.setPaintProperty("building-extrusion", "fill-color", PALETTE.building);
    map.setPaintProperty(
      "building-extrusion",
      "fill-outline-color",
      PALETTE.buildingOutline,
    );
    map.setPaintProperty("building-extrusion", "fill-opacity", 0.8);
  }

  // Borders
  const borderIds = [
    "boundary_state",
    "boundary_country_z0-4",
    "boundary_country_z5-",
    "admin_0_boundary_lines_land",
    "admin_1_states_provinces_lines",
  ];

  borderIds.forEach((id) => {
    if (map.getLayer(id)) {
      const isCountry = id.includes("country") || id.includes("admin_0");
      map.setPaintProperty(
        id,
        "line-color",
        isCountry ? PALETTE.borderProminent : PALETTE.border,
      );
      map.setPaintProperty(id, "line-width", isCountry ? 1 : 0.5);
      map.setPaintProperty(id, "line-opacity", 0.6);
    }
  });

  // Roads & Labels
  const layers = map.getStyle().layers ?? [];

  for (const layer of layers) {
    if (!layer.id) continue;

    // Roads
    if (
      layer.type === "line" &&
      (layer.id.includes("highway") ||
        layer.id.includes("road") ||
        layer.id.includes("street") ||
        layer.id.includes("path")) &&
      layer.paint &&
      "line-color" in layer.paint
    ) {
      const isMajor =
        layer.id.includes("motorway") ||
        layer.id.includes("trunk") ||
        layer.id.includes("primary");
      map.setPaintProperty(
        layer.id,
        "line-color",
        isMajor ? PALETTE.roadMajor : PALETTE.road,
      );
      map.setPaintProperty(layer.id, "line-opacity", isMajor ? 0.7 : 0.3); // Minor roads barely visible
    }

    // Labels
    if (layer.type === "symbol" && layer.paint && "text-color" in layer.paint) {
      const isProminent =
        layer.id.includes("place_country") ||
        layer.id.includes("place_city") ||
        layer.id.includes("major");

      map.setPaintProperty(
        layer.id,
        "text-color",
        isProminent ? PALETTE.labelProminent : PALETTE.label,
      );
      map.setPaintProperty(layer.id, "text-halo-color", PALETTE.labelHalo);
      map.setPaintProperty(layer.id, "text-halo-width", isProminent ? 1.5 : 1);
      map.setPaintProperty(layer.id, "text-opacity", isProminent ? 0.9 : 0.65);
    }
  }
}

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [-77.04, 38.907],
      zoom: 11.15,
      fadeDuration: 100,
      attributionControl: false,
    });

    map.on("load", () => {
      applyIcarusTheme(map);
      map.resize();
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full"
      style={{ minHeight: 0, backgroundColor: PALETTE.land }}
    />
  );
}
