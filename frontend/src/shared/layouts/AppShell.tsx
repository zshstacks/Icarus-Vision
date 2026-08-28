import TopNav from "../../features/navbar/components/TopNav";
import LayerTree from "../../features/sidebar-left/components/LayerTree";
import DataFilters from "../../features/sidebar-left/components/DataFilters";
import TelemetryPanel from "../../features/inspector/components/TelemetryPanel";
// import RouteSummary from "../../features/inspector/components/RouteSummary";
import StatusBar from "../../features/statusbar/components/StatusBar";
import MapView from "../../features/map/components/MapView";

export default function AppShell() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0D1117] text-[#E6EDF3] font-sans">
      {/* Top Navigation */}
      <TopNav />

      {/* Main content row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex w-64 flex-col border-r border-[#30363D] bg-[#161B22]">
          <LayerTree />
          <DataFilters />
        </aside>

        {/* Map */}
        <main className="relative flex-1 min-h-0 bg-[#0D1117]">
          <div className="absolute inset-0">
            <MapView />
          </div>
        </main>

        {/* Right Inspector */}
        <aside className="flex w-80 flex-col border-l border-[#30363D] bg-[#161B22]">
          <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3">
            <span className="text-xs font-semibold tracking-wider text-[#8B949E]">
              INSPECTOR
            </span>
            <div className="flex items-center gap-2 text-[#6E7681]">
              <button className="hover:text-[#E6EDF3]">★</button>
              <button className="hover:text-[#E6EDF3]">−</button>
              <button className="hover:text-[#E6EDF3]">×</button>
            </div>
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
