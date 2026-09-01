import FpsCounter from "./FpsCounter";

export default function StatusBar() {
  return (
    <footer className="flex h-8 items-center justify-between border-t border-[#30363D] bg-[#161B22] px-4 text-xs text-[#8B949E]">
      <div className="flex items-center gap-6 ">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3FB950] animate-pulse" />
        </div>

        <div>
          <span className="uppercase tracking-wider">Data Source</span>{" "}
          <span className="text-[#E6EDF3]">ADS-B: LIVE</span>
          <span className="mx-1.5 text-[#484F58]">·</span>
          <span className="text-[#E6EDF3]">MLAT: LIVE</span>
          <span className="mx-1.5 text-[#484F58]">·</span>
          <span className="text-[#E6EDF3]">RADAR: LIVE</span>
        </div>

        <div>
          <span className="uppercase tracking-wider">Delay</span>{" "}
          <span className="font-mono text-[#E6EDF3]">1.2s</span>
        </div>

        <div>
          <span className="uppercase tracking-wider">Latency</span>{" "}
          <span className="font-mono text-[#E6EDF3]">78ms</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider">FPS</span>
          <FpsCounter />
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono">
        <button className="text-[#6E7681] hover:text-[#E6EDF3]">↻</button>
        <span>14:27:53 UTC</span>
      </div>
    </footer>
  );
}
