import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { Map } from "maplibre-gl";
import type { AppDispatch, RootState } from "../../../redux/store";
import { useDispatch, useSelector } from "react-redux";
import findTrack from "../../../utility/helpers/findTrack";
import { trackSelected } from "../../../redux/selectSlice/selectSlice";

type MapSearchProps = {
  map: Map | null;
};

export default function MapSearch({ map }: MapSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dispatch: AppDispatch = useDispatch();
  const tracks = useSelector((state: RootState) => state.tracks.tracks);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleSearch = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const result = findTrack(tracks, query);

    if (result) {
      dispatch(trackSelected(result.id));
      map?.flyTo({
        center: [result.lon, result.lat],
        zoom: 10,
      });
      setMessage(null);
    } else {
      setMessage(`No match for "${trimmedQuery}"`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setMessage(null);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      handleSearch();
    }
  };

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [message]);

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
          onClick={() => {
            if (!open) {
              setOpen(true);
            } else {
              handleSearch();
            }
          }}
          className="
            flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center
            text-[#8B949E] hover:text-[#E6EDF3]
            transition-colors
          "
          title={open ? "Search" : "Open search"}
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
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setMessage(null); //clear miss message
            }}
            placeholder="Search callsign, ICAO…"
            className="
              h-full w-full bg-transparent
              text-[13px] text-[#E6EDF3]
              placeholder:text-[#6E7681]
              outline-none
            "
            onKeyDown={handleKeyDown}
          />

          <button
            onClick={() => {
              setOpen(false);
              setQuery("");
              setMessage(null);
            }}
            className="
              mr-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center
              rounded-md text-[#6E7681]
              hover:bg-[#21262D] hover:text-[#E6EDF3]
              transition-colors
            "
            title="Close search"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {message && (
        <div
          key={message} //treat like a new elem "for animation wise, idk if its works actually"
          className="mt-1.5 rounded-md border border-[#30363D]
      bg-[#161B22]/95 px-2.5 py-1.5
      text-[11px] text-[#8B949E]
      shadow-lg shadow-black/20 backdrop-blur-md
      animate-[fadeSlideIn_200ms_ease-out] "
        >
          {message}
        </div>
      )}
    </div>
  );
}
