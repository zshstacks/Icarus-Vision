import { Target } from "lucide-react";

export default function TopNav() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4">
      {/* Left: Logo + Nav links */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded  text-[#39C5CF]">
            <Target />
          </div>
          <span className="text-sm font-semibold tracking-wide text-[#E6EDF3]">
            Icarus Vision
          </span>
        </div>

        <nav className="flex items-center gap-1 text-sm">
          {["Overview", "Map", "Analytics", "Assets", "Alerts", "Reports"].map(
            (item) => (
              <button
                key={item}
                className={`rounded px-3 py-1.5 transition-colors ${
                  item === "Map"
                    ? "bg-[#1C2128] text-[#E6EDF3]"
                    : "text-[#8B949E] hover:bg-[#1C2128] hover:text-[#E6EDF3]"
                }`}
              >
                {item}
                {item === "Alerts" && (
                  <span className="ml-1.5 rounded-full bg-[#D29922]/20 px-1.5 text-xs text-[#D29922]">
                    3
                  </span>
                )}
              </button>
            ),
          )}
        </nav>
      </div>

      {/* Right:  time + user */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono text-[#8B949E]">14:27:53 UTC</span>

        <button className="text-[#8B949E] hover:text-[#E6EDF3]">⚙</button>
        <button className="text-[#8B949E] hover:text-[#E6EDF3]">?</button>

        <div className="flex items-center gap-2">
          <span className="text-[#8B949E]">zshstacks</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#30363D] text-xs font-medium text-[#E6EDF3]">
            Z
          </div>
        </div>
      </div>
    </header>
  );
}
