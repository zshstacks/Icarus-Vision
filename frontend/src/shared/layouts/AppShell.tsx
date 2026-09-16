import TopNav from "../../features/navbar/components/TopNav";
// import LayerTree from "../../features/sidebar-left/components/LayerTree";
// import DataFilters from "../../features/sidebar-left/components/DataFilters";
import TelemetryPanel from "../../features/inspector/components/TelemetryPanel";
// import RouteSummary from "../../features/inspector/components/RouteSummary";
import StatusBar from "../../features/statusbar/components/StatusBar";
import MapView from "../../features/map/components/MapView";
import MapSearch from "../../features/map/components/MapSearch";
import { useState } from "react";
import type { Map } from "maplibre-gl";

export default function AppShell() {
  const [map, setMap] = useState<Map | null>(null);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0D1117] text-[#E6EDF3] font-sans">
      {/* top navigation */}
      <TopNav />

      {/* main content */}
      <div className="relative flex-1 overflow-hidden">
        {/* map */}
        <main className="absolute inset-0">
          <MapView map={map} onMapReady={setMap} />
          <MapSearch map={map} />
        </main>

        {/*left panel*/}
        {/* <aside
          className="
            absolute left-3 top-3 bottom-3 z-20
            flex w-64 flex-col
            rounded-xl border border-[#30363D]
            bg-[#161B22]/95 backdrop-blur-md
            shadow-[0_8px_32px_rgba(0,0,0,0.45)]
            overflow-hidden
          "
        > */}
        {/* real content */}
        {/* <div className="pointer-events-none select-none opacity-40 flex-1 overflow-y-auto">
            <LayerTree />
            <DataFilters />
          </div> */}

        {/* development overlay */}
        {/* <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D1117]/50 backdrop-blur-[1px]">
            <div className="rounded-md border border-[#30363D] bg-[#161B22] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">
              In development
            </div>
            <p className="mt-2 max-w-36 text-center text-[11px] leading-snug text-[#6E7681]">
              Layers & filters coming soon
            </p>
          </div>
        </aside> */}

        {/*inspector*/}
        <aside
          className="
    absolute right-3 top-3 bottom-3 z-20
    flex w-80 flex-col
    rounded-xl border border-[#30363D]/80
    bg-[#161B22]/95 backdrop-blur-xl
    shadow-[0_8px_32px_rgba(0,0,0,0.4)]
    overflow-hidden
  "
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] font-medium text-[#6E7681]">
              Inspector
            </span>
          </div>

          <div className="h-px bg-[#21262D]" />

          {/* scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <TelemetryPanel />
          </div>
        </aside>
      </div>

      {/* status bar */}
      <StatusBar />
    </div>
  );
}
