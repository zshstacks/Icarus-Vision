import TopNav from "../../features/navbar/components/TopNav";
import TelemetryPanel from "../../features/inspector/components/TelemetryPanel";
import StatusBar from "../../features/statusbar/components/StatusBar";
import MapView from "../../features/map/components/MapView";
import AircraftList from "../../features/sidebar-left/components/AircraftList";
import { useState } from "react";
import type { Map } from "maplibre-gl";

export default function AppShell() {
  const [map, setMap] = useState<Map | null>(null);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0D1117] text-[#E6EDF3] font-sans">
      <TopNav />

      <div className="relative flex-1 overflow-hidden">
        <main className="absolute inset-0">
          <MapView map={map} onMapReady={setMap} />
        </main>

        <aside
          className="
            absolute left-3 top-3 bottom-3 z-20
            flex w-80 flex-col
            rounded-xl border border-[#30363D]/80
            bg-[#161B22]/95 backdrop-blur-xl
            shadow-xl shadow-black/40
            overflow-hidden
          "
        >
          <AircraftList map={map} />
        </aside>

        <aside className="absolute right-3 top-3 bottom-3 z-20 flex w-80 flex-col rounded-xl border border-[#30363D]/80 bg-[#161B22]/95 backdrop-blur-xl shadow-xl shadow-black overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] font-medium text-[#6E7681]">
              Inspector
            </span>
          </div>

          <div className="h-px bg-[#21262D]" />

          <div className="flex-1 overflow-y-auto">
            <TelemetryPanel />
          </div>
        </aside>
      </div>

      <StatusBar />
    </div>
  );
}
