import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";
import { useEffect, useState } from "react";

export default function TelemetryPanel() {
  const selectedTrack = useSelector((state: RootState) => {
    const id = state.selection.id;
    return id ? state.tracks.tracks[id] : null;
  });
  const [, setTick] = useState(0);

  //force a re-render every second for (Xs ago)
  useEffect(() => {
    if (!selectedTrack) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [selectedTrack]);

  if (!selectedTrack) {
    return (
      <div className="border-b border-[#30363D]">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold tracking-wider text-[#8B949E]">
            AIRCRAFT TELEMETRY
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="text-xs font-mono font-medium text-[#8B949E] tracking-wide">
            NO TARGET SELECTED
          </div>
          <p className="mt-1 text-[#6E7681] text-xs">
            Select an aircraft on the map to inspect telemetry data.
          </p>
        </div>
      </div>
    );
  }

  function formatLastUpdate(timestampSeconds: number): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const elapsedSeconds = Math.max(0, nowInSeconds - timestampSeconds);

    if (elapsedSeconds < 10) {
      return "just now";
    }

    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s ago`;
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    return `${elapsedMinutes}m ago`;
  }

  function formatVerticalRate(rate: number | null): {
    text: string;
    className: string;
    arrow: string | null;
    arrowClass: string;
  } {
    if (rate == null) {
      return {
        text: "N/A",
        className: "text-[#E6EDF3]",
        arrow: null,
        arrowClass: "",
      };
    }

    if (rate > 0) {
      return {
        text: `+${rate} fpm ↑`,
        className: "text-[#3FB950]",
        arrow: "↑",
        arrowClass: "text-[#3FB950]",
      };
    }

    if (rate < 0) {
      return {
        text: `${rate} fpm ↓`,
        className: "text-[#F85149]",
        arrow: "↓",
        arrowClass: "text-[#F85149]",
      };
    }

    return {
      text: "0 fpm",
      className: "text-[#E6EDF3]",
      arrow: null,
      arrowClass: "",
    };
  }

  const {
    text: vrText,
    className: vrClass,
    arrow: vrArrow,
    arrowClass: vrArrowClass,
  } = formatVerticalRate(selectedTrack.vertical_rate);

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
          <div className="text-lg font-semibold text-[#E6EDF3]">
            {selectedTrack.callsign ?? "N/A"}
          </div>
        </div>

        {/* Key / Value grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div className="text-[#8B949E]">Callsign</div>
          <div className="text-right font-mono text-[#E6EDF3]">
            {selectedTrack.callsign ?? "N/A"}
          </div>

          <div className="text-[#8B949E]">Altitude</div>
          <div className="text-right font-mono text-[#E6EDF3]">
            {selectedTrack.altitude != null ? (
              <>
                {selectedTrack.altitude}
                {vrArrow != null && (
                  <>
                    {" "}
                    <span className={vrArrowClass}>{vrArrow}</span>
                  </>
                )}
              </>
            ) : (
              "N/A"
            )}
          </div>

          <div className="text-[#8B949E]">Ground Speed</div>
          <div className="text-right font-mono text-[#E6EDF3]">
            {selectedTrack.speed != null ? `${selectedTrack.speed} kt` : "N/A"}
          </div>

          <div className="text-[#8B949E]">Track</div>
          <div className="text-right font-mono text-[#E6EDF3]">
            {selectedTrack.heading != null
              ? `${selectedTrack.heading}°`
              : "N/A"}
          </div>

          <div className="text-[#8B949E]">Vertical Rate</div>
          <div className={`text-right font-mono ${vrClass}`}>{vrText}</div>

          <div className="text-[#8B949E]">Last Update</div>
          <div className="text-right font-mono text-[#E6EDF3]">
            {formatLastUpdate(selectedTrack.timestamp)}
          </div>
        </div>
        {/* Position block */}
        <div className="rounded border border-[#30363D] bg-[#1C2128] p-3">
          <div className="mb-2 text-xs font-semibold tracking-wider text-[#8B949E]">
            POSITION
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <div className="text-[#8B949E]">Latitude</div>
            <div className="text-right font-mono text-[#E6EDF3]">
              {selectedTrack.lat}° N
            </div>
            <div className="text-[#8B949E]">Longitude</div>
            <div className="text-right font-mono text-[#E6EDF3]">
              {selectedTrack.lon}° W
            </div>
            <div className="text-[#8B949E]">Heading</div>
            <div className="text-right font-mono text-[#E6EDF3]">
              {selectedTrack.heading != null
                ? `${selectedTrack.heading}°`
                : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
