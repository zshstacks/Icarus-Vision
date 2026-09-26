import { Settings, HelpCircle, Bell } from "lucide-react";

export default function TopNav() {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#30363D]/80 bg-[#161B22]/90 backdrop-blur-md px-4">
      {/* logo and title */}
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#21262D]">
          {/* logo template */}
          <div className="h-3.5 w-3.5 rotate-45 rounded-sm border-2 border-[#39C5CF]" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-[#E6EDF3]">
          Icarus Vision
        </span>
      </div>

      {/*  primary navigation */}
      <nav className="flex items-center gap-1">
        <button
          className="
            relative rounded-md px-3 py-1.5 text-[13px] font-medium
            text-[#E6EDF3] bg-[#21262D]
          "
        >
          Map
        </button>

        <button
          className="
            relative rounded-md px-3 py-1.5 text-[13px] font-medium
            text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D]/60
            transition-colors
          "
        >
          Alerts
          <span
            className="
              absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center
              rounded-full bg-[#D29922]  px-1 text-[10px] font-semibold text-neutral-900
            "
          >
            3
          </span>
        </button>
      </nav>

      {/* actions */}
      <div className="flex items-center gap-1">
        <button
          className="
            flex h-8 w-8 items-center justify-center rounded-md
            text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]
            transition-colors
          "
          title="Notifications"
        >
          <Bell size={16} strokeWidth={1.75} />
        </button>

        <button
          className="
            flex h-8 w-8 items-center justify-center rounded-md
            text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]
            transition-colors
          "
          title="Help"
        >
          <HelpCircle size={16} strokeWidth={1.75} />
        </button>

        <button
          className="
            flex h-8 w-8 items-center justify-center rounded-md
            text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]
            transition-colors
          "
          title="Settings"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>

        {/* user */}
        <div className="ml-2 flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[#21262D] transition-colors cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#30363D] text-[11px] font-medium text-[#E6EDF3]">
            Z
          </div>
          <span className="text-[13px] font-medium text-[#E6EDF3]">
            zhstacks
          </span>
        </div>
      </div>
    </header>
  );
}
