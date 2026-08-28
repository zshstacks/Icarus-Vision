export default function DataFilters() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold tracking-wider text-[#8B949E]">
          DATA FILTERS
        </span>
        <button className="text-[#6E7681] hover:text-[#E6EDF3]">▴</button>
      </div>

      <div className="space-y-4 px-4 pb-4">
        {/* Time Range */}
        {/* <div>
          <label className="mb-1.5 block text-xs text-[#8B949E]">
            Time Range
          </label>
          <select
            className="w-full rounded border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] outline-none focus:border-[#39C5CF]"
            defaultValue="Last 2 Hours"
          >
            <option>Last 2 Hours</option>
            <option>Last 6 Hours</option>
            <option>Last 24 Hours</option>
            <option>Custom…</option>
          </select>
        </div> */}

        {/* Altitude */}
        <div>
          <label className="mb-1.5 block text-xs text-[#8B949E]">
            Altitude
          </label>
          <select
            className="w-full rounded border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] outline-none focus:border-[#39C5CF]"
            defaultValue="All Altitudes"
          >
            <option>All Altitudes</option>
            <option>FL180 – FL300</option>
            <option>FL300 – FL400</option>
            <option>Above FL400</option>
          </select>
        </div>

        {/* Aircraft Type */}
        <div>
          <label className="mb-1.5 block text-xs text-[#8B949E]">
            Aircraft Type
          </label>
          <select
            className="w-full rounded border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] outline-none focus:border-[#39C5CF]"
            defaultValue="All Types"
          >
            <option>All Types</option>
            <option>Narrow-body</option>
            <option>Wide-body</option>
            <option>Regional</option>
          </select>
        </div>

        {/* Callsign Pattern */}
        <div>
          <label className="mb-1.5 block text-xs text-[#8B949E]">
            Callsign Pattern
          </label>
          <input
            type="text"
            placeholder="ICAO / Regex"
            className="w-full rounded border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] placeholder:text-[#6E7681] outline-none focus:border-[#39C5CF]"
            readOnly
          />
        </div>

        {/* Reset */}
        <button className="mt-2 w-full rounded border border-[#30363D] bg-[#1C2128] py-2 text-sm text-[#8B949E] transition-colors hover:border-[#484F58] hover:text-[#E6EDF3]">
          RESET FILTERS
        </button>
      </div>

      <div className="mt-auto border-t border-[#30363D] px-4 py-3 text-xs text-[#6E7681]">
        6 layers active
      </div>
    </div>
  );
}
