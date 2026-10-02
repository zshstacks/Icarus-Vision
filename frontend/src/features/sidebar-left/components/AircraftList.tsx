import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, X } from "lucide-react";
import type { Map } from "maplibre-gl";
import type { AppDispatch, RootState } from "../../../redux/store";
import { trackSelected } from "../../../redux/selectSlice/selectSlice";
import type { tracksType } from "../../../utility/types/reduxTypes";

const M_TO_FT = 3.28084;
const MPS_TO_KT = 1.94384;
const ROW_HEIGHT = 32;

type SortKey = "distance" | "altitude" | "speed";
type SortDir = "asc" | "desc";

interface Props {
  map: Map | null;
}

export default function AircraftList({ map }: Props) {
  const dispatch: AppDispatch = useDispatch();
  const tracks = useSelector((s: RootState) => s.tracks.tracks);
  const selectedId = useSelector((s: RootState) => s.selection.id);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Map center is captured on moveend, compute distance-from-view
  const [mapCenter, setMapCenter] = useState<{
    lon: number;
    lat: number;
  } | null>(null);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      const c = map.getCenter();
      setMapCenter({ lon: c.lng, lat: c.lat });
    };
    update();
    map.on("moveend", update);
    return () => {
      map.off("moveend", update);
    };
  }, [map]);

  const rows = useMemo(() => {
    const all = Object.values(tracks);
    const q = query.trim().toLowerCase();

    // Filter
    const filtered =
      q === ""
        ? all
        : all.filter((t) => {
            const cs = (t.callsign ?? "").toLowerCase();
            return cs.includes(q) || t.id.toLowerCase().includes(q);
          });

    // Decorate with distance
    const decorated = filtered.map((t) => {
      let dist = Number.POSITIVE_INFINITY;
      if (mapCenter) {
        const dx = t.lon - mapCenter.lon;
        const dy = t.lat - mapCenter.lat;

        dist = dx * dx + dy * dy;
      }
      return { t, dist };
    });

    const dir = sortDir === "asc" ? 1 : -1;

    decorated.sort((a, b) => {
      switch (sortKey) {
        case "distance":
          return (a.dist - b.dist) * dir;
        case "altitude": {
          // Aircraft w/o altitude sort to the bottom regardless of direction
          const av = a.t.altitude;
          const bv = b.t.altitude;
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av - bv) * dir;
        }
        case "speed": {
          const av = a.t.speed;
          const bv = b.t.speed;
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av - bv) * dir;
        }
      }
    });

    return decorated.map((d) => d.t);
  }, [tracks, query, sortKey, sortDir, mapCenter]);

  // Virtualizer
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  // Reset scroll when sort order changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "distance" ? "asc" : "desc");
    }
  };

  const handleRowClick = (t: tracksType) => {
    dispatch(trackSelected(t.id));
    if (map) {
      const targetZoom = Math.max(map.getZoom(), 6);
      map.flyTo({
        center: [t.lon, t.lat],
        zoom: targetZoom,
        duration: 800,
      });
    }
  };

  const arrowFor = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? "↑" : "↓";
  };

  return (
    <div className="flex h-full flex-col">
      {/* search */}
      <div className="shrink-0 border-b border-[#21262D] p-2">
        <div className="relative">
          <Search
            size={12}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E7681]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                (e.target as HTMLInputElement).blur();
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();

                if (rows.length > 0) {
                  handleRowClick(rows[0]);
                }
              }
            }}
            placeholder="Search callsign, ICAO…"
            className="h-7 w-full rounded-md border border-[#21262D] bg-[#0D1117] pl-7 pr-7 text-[12px] text-[#E6EDF3] placeholder:text-[#6E7681] outline-none focus:border-[#30363D]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#6E7681] hover:text-[#E6EDF3]"
              title="Clear"
            >
              <X size={11} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* column headers */}
      <div className="shrink-0 border-b border-[#21262D] px-2 py-1.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#6E7681]">
          <span className="w-1.5 shrink-0" />
          <button
            onClick={() => toggleSort("distance")}
            className={`flex-1 min-w-0 cursor-pointer text-left transition-colors hover:text-[#E6EDF3] ${
              sortKey === "distance" ? "text-[#E6EDF3]" : ""
            }`}
          >
            Near {arrowFor("distance")}
          </button>
          <button
            onClick={() => toggleSort("altitude")}
            className={`w-12 shrink-0 cursor-pointer text-right transition-colors hover:text-[#E6EDF3] ${
              sortKey === "altitude" ? "text-[#E6EDF3]" : ""
            }`}
          >
            Alt {arrowFor("altitude")}
          </button>
          <button
            onClick={() => toggleSort("speed")}
            className={`w-11 shrink-0 cursor-pointer text-right transition-colors hover:text-[#E6EDF3] ${
              sortKey === "speed" ? "text-[#E6EDF3]" : ""
            }`}
          >
            Spd {arrowFor("speed")}
          </button>
        </div>
      </div>

      {/* list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="text-[11px] text-[#6E7681]">
              {query ? "No matches" : "No aircraft tracked"}
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((v) => {
              const t = rows[v.index];
              const isSelected = t.id === selectedId;

              const altFt =
                t.altitude == null ? null : Math.round(t.altitude * M_TO_FT);
              const speedKt =
                t.speed == null ? null : Math.round(t.speed * MPS_TO_KT);

              return (
                <div
                  key={t.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${v.size}px`,
                    transform: `translateY(${v.start}px)`,
                  }}
                >
                  <button
                    onClick={() => handleRowClick(t)}
                    className={`flex h-8 w-full cursor-pointer items-center gap-2 px-2 text-left transition-colors ${
                      isSelected
                        ? "bg-[#58A6FF]/10 text-[#E6EDF3]"
                        : "text-[#8B949E] hover:bg-[#21262D]/50"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        isSelected
                          ? "bg-[#F2C94C]"
                          : t.on_ground
                            ? "bg-[#6E7681]"
                            : "bg-[#58A6FF]"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#E6EDF3]">
                      {t.callsign || t.id.toUpperCase()}
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums">
                      {altFt != null ? altFt.toLocaleString("en-US") : "—"}
                    </span>
                    <span className="w-11 shrink-0 text-right font-mono text-[10px] tabular-nums">
                      {speedKt != null ? speedKt : "—"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* footer count */}
      <div className="shrink-0 border-t border-[#21262D] px-2 py-1 font-mono text-[10px] tabular-nums text-[#6E7681]">
        {rows.length.toLocaleString("en-US")} aircraft
        {query && " · filtered"}
      </div>
    </div>
  );
}
