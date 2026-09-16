import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";

function formatLastUpdate(timestampSeconds: number): string {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const elapsedSeconds = Math.max(0, nowInSeconds - timestampSeconds);

  if (elapsedSeconds < 10) return "just now";
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  return `${Math.floor(elapsedMinutes / 60)}h ago`;
}

function formatCoordinate(
  value: number | null | undefined,
  positive: string,
  negative: string,
): string {
  if (value == null) return "N/A";
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
}

function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "N/A";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getVerticalRate(rate: number | null | undefined) {
  if (rate == null) {
    return { value: "N/A", className: "text-[#8B949E]", arrow: "" };
  }
  if (rate > 0) {
    return {
      value: `+${formatNumber(rate)} fpm`,
      className: "text-[#3FB950]",
      arrow: "↑",
    };
  }
  if (rate < 0) {
    return {
      value: `${formatNumber(rate)} fpm`,
      className: "text-[#F85149]",
      arrow: "↓",
    };
  }
  return { value: "0 fpm", className: "text-[#8B949E]", arrow: "" };
}

function HeadingIndicator({ heading }: { heading: number | null | undefined }) {
  if (heading == null) {
    return (
      <div className="flex h-28 items-center justify-center text-xs text-[#6E7681]">
        N/A
      </div>
    );
  }

  const normalized = ((heading % 360) + 360) % 360;
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div className="relative mx-auto mt-3 flex h-28 w-28 items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#21262D"
          strokeWidth="1.5"
        />
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="#30363D"
          strokeWidth="1"
        />

        {ticks.map((deg) => {
          const isCardinal = deg % 90 === 0;
          const rad = ((deg - 90) * Math.PI) / 180;
          const outer = 48;
          const inner = isCardinal ? 38 : 42;
          return (
            <line
              key={deg}
              x1={60 + outer * Math.cos(rad)}
              y1={60 + outer * Math.sin(rad)}
              x2={60 + inner * Math.cos(rad)}
              y2={60 + inner * Math.sin(rad)}
              stroke={isCardinal ? "#8B949E" : "#30363D"}
              strokeWidth={isCardinal ? 1.5 : 1}
            />
          );
        })}

        {[
          { label: "N", deg: 0 },
          { label: "E", deg: 90 },
          { label: "S", deg: 180 },
          { label: "W", deg: 270 },
        ].map(({ label, deg }) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const r = 32;
          return (
            <text
              key={label}
              x={60 + r * Math.cos(rad)}
              y={60 + r * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[#E6EDF3] text-[10px] font-medium"
            >
              {label}
            </text>
          );
        })}

        <g
          style={{
            transform: `rotate(${normalized}deg)`,
            transformOrigin: "60px 60px",
            transition: "transform 300ms ease-out",
          }}
        >
          <polygon points="60,18 64,60 60,66 56,60" fill="#58A6FF" />
          <polygon points="60,66 63,78 60,74 57,78" fill="#8B949E" />
          <circle cx="60" cy="60" r="3.5" fill="#E6EDF3" />
        </g>
      </svg>

      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-mono text-[12px] tabular-nums text-[#E6EDF3]">
        {normalized.toFixed(0).padStart(3, "0")}°
      </div>
    </div>
  );
}

export default function TelemetryPanel() {
  const selectedTrack = useSelector((state: RootState) => {
    const id = state.selection.id;
    return id ? state.tracks.tracks[id] : null;
  });

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!selectedTrack) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [selectedTrack]);

  if (!selectedTrack) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
        <div className="text-[13px] font-medium text-[#8B949E]">
          No aircraft selected
        </div>
        <p className="mt-2 max-w-48 text-[12px] leading-relaxed text-[#6E7681]">
          Select an aircraft on the map to inspect its telemetry.
        </p>
      </div>
    );
  }

  void tick; // keep last update fresh

  const verticalRate = getVerticalRate(selectedTrack.vertical_rate);
  const lastUpdate = formatLastUpdate(selectedTrack.timestamp);
  const isRecent = Math.floor(Date.now() / 1000) - selectedTrack.timestamp < 60;

  return (
    <div>
      {/* identity */}
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-0.5 text-[11px] text-[#6E7681]">Aircraft</div>
            <div className="font-mono text-lg font-medium tracking-tight">
              {selectedTrack.callsign ?? "N/A"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isRecent ? "bg-[#58A6FF]" : "bg-[#6E7681]"
              }`}
            />
            <span
              className={`text-[11px] ${
                isRecent ? "text-[#58A6FF]" : "text-[#6E7681]"
              }`}
            >
              {isRecent ? "Live" : "Stale"}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#21262D]" />

      {/* primary numbers */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <div className="mb-1 text-[11px] text-[#6E7681]">Altitude</div>
            <div className="font-mono text-[28px] font-medium leading-none tracking-tight tabular-nums">
              {formatNumber(selectedTrack.altitude)}
              <span className="ml-1.5 text-[13px] font-normal text-[#8B949E]">
                ft
              </span>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-[#6E7681]">Ground speed</div>
            <div className="font-mono text-[28px] font-medium leading-none tracking-tight tabular-nums">
              {formatNumber(selectedTrack.speed)}
              <span className="ml-1.5 text-[13px] font-normal text-[#8B949E]">
                kt
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6">
          <div>
            <div className="mb-0.5 text-[11px] text-[#6E7681]">
              Vertical rate
            </div>
            <div
              className={`flex items-center gap-1 font-mono text-[13px] tabular-nums ${verticalRate.className}`}
            >
              {verticalRate.arrow && (
                <span className="text-[11px]">{verticalRate.arrow}</span>
              )}
              <span>{verticalRate.value}</span>
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[11px] text-[#6E7681]">Last update</div>
            <div className="font-mono text-[13px] tabular-nums text-[#8B949E]">
              {lastUpdate}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#21262D]" />

      {/* heading */}
      <div className="px-4 py-4">
        <div className="mb-1 text-[11px] text-[#6E7681]">Heading</div>
        <HeadingIndicator heading={selectedTrack.heading} />
      </div>

      <div className="h-px bg-[#21262D]" />

      {/* position */}
      <div className="px-4 py-4">
        <div className="mb-3 text-[11px] text-[#6E7681]">Position</div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-[#6E7681]">Latitude</span>
            <span className="font-mono text-[12px] tabular-nums">
              {formatCoordinate(selectedTrack.lat, "N", "S")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-[#6E7681]">Longitude</span>
            <span className="font-mono text-[12px] tabular-nums">
              {formatCoordinate(selectedTrack.lon, "E", "W")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
