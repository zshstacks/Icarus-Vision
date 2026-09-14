import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

export default function MapSearch() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  return (
    <div className="absolute left-4 top-4 z-20">
      <div
        className={`
          flex h-9 items-center
          rounded-lg border border-[#30363D]
          bg-[#161B22]/90 backdrop-blur-md
          shadow-lg shadow-black/25
          transition-all duration-400 ease-out
          ${open ? "w-72" : "w-9 hover:border-[#484F58]"}
        `}
      >
        {/* Icon  */}
        <button
          onClick={() => setOpen(true)}
          className="
            flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center
            text-[#8B949E] hover:text-[#E6EDF3]
            transition-colors
          "
        >
          <Search size={15} strokeWidth={1.75} />
        </button>

        {/* Expanding content */}
        <div
          className={`
            flex flex-1 items-center overflow-hidden
            transition-opacity duration-150
            ${open ? "opacity-100" : "opacity-0 pointer-events-none"}
          `}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Search callsign, ICAO…"
            className="
              h-full w-full bg-transparent
              text-[13px] text-[#E6EDF3]
              placeholder:text-[#6E7681]
              outline-none
            "
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />

          <button
            onClick={() => setOpen(false)}
            className="
              mr-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center
              rounded-md text-[#6E7681]
              hover:bg-[#21262D] hover:text-[#E6EDF3]
              transition-colors
            "
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
