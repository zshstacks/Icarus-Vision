export default function TelemetryPanel() {
  return (
    <div className="border-b border-[#30363D]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold tracking-wider text-[#8B949E]">
          AIRCRAFT TELEMETRY
        </span>
        <button className="text-[#6E7681] hover:text-[#E6EDF3]">▴</button>
      </div>

      <div className="space-y-4 px-4 pb-4">
        {/* Header */}
        <div>
          <div className="text-lg font-semibold text-[#E6EDF3]">DAL182</div>
          {/* <div className="text-sm text-[#8B949E]">Boeing 767-300ER</div> */}
        </div>

        {/* Key / Value grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div className="text-[#8B949E]">Callsign</div>
          <div className="text-right font-mono text-[#E6EDF3]">DAL182</div>

          <div className="text-[#8B949E]">Altitude</div>
          <div className="text-right font-mono text-[#E6EDF3]">
            FL350 <span className="text-[#3FB950]">↑</span>
          </div>

          <div className="text-[#8B949E]">Ground Speed</div>
          <div className="text-right font-mono text-[#E6EDF3]">487 kt</div>

          <div className="text-[#8B949E]">Track</div>
          <div className="text-right font-mono text-[#E6EDF3]">043°</div>

          <div className="text-[#8B949E]">Vertical Rate</div>
          <div className="text-right font-mono text-[#3FB950]">+1200 fpm</div>

          <div className="text-[#8B949E]">Last Update</div>
          <div className="text-right font-mono text-[#E6EDF3]">
            14:27:49 UTC
          </div>

          {/* <div className="text-[#8B949E]">Source</div>
          <div className="text-right text-[#39C5CF]">ADS-B / MLAT</div> */}
        </div>

        {/* Position block */}
        <div className="rounded border border-[#30363D] bg-[#1C2128] p-3">
          <div className="mb-2 text-xs font-semibold tracking-wider text-[#8B949E]">
            POSITION
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <div className="text-[#8B949E]">Latitude</div>
            <div className="text-right font-mono text-[#E6EDF3]">
              43.6521° N
            </div>
            <div className="text-[#8B949E]">Longitude</div>
            <div className="text-right font-mono text-[#E6EDF3]">
              73.8124° W
            </div>
            <div className="text-[#8B949E]">Heading</div>
            <div className="text-right font-mono text-[#E6EDF3]">043°</div>
          </div>
        </div>
      </div>
    </div>
  );
}
