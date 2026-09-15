import TopNav from "../../features/navbar/components/TopNav";
import LayerTree from "../../features/sidebar-left/components/LayerTree";
import DataFilters from "../../features/sidebar-left/components/DataFilters";
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
      {/* Top Navigation */}
      <TopNav />

      {/* Main content row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="relative flex w-64 flex-col border-r border-[#30363D] bg-[#161B22]">
          {/* Real content  */}
          <div className="pointer-events-none select-none opacity-40">
            <LayerTree />
            <DataFilters />
          </div>

          {/* Overlay + badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D1117]/60 backdrop-blur-[1px]">
            <div className="rounded border border-[#30363D] bg-[#161B22] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">
              In development
            </div>
            <p className="mt-2 max-w-35 text-center text-[11px] leading-snug text-[#6E7681]">
              Layers & filters coming soon
            </p>
          </div>
        </aside>

        {/* Map */}
        <main className="relative flex-1 min-h-0 bg-[#0D1117]">
          <div className="absolute inset-0">
            <MapView map={map} onMapReady={setMap} />
          </div>
          <MapSearch map={map} />
        </main>

        {/* Right Inspector */}
        <aside className="flex w-80 flex-col border-l border-[#30363D] bg-[#161B22]">
          <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3">
            <span className="text-xs font-semibold tracking-wider text-[#8B949E]">
              INSPECTOR
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TelemetryPanel />
            {/* <RouteSummary /> */}
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  );
}
