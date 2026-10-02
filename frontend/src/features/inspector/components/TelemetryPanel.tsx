import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../redux/store";
import {
  followToggled,
  trackSelected,
  trailMinutesSet,
  TRAIL_MINUTES_OPTIONS,
  type TrailMinutes,
} from "../../../redux/selectSlice/selectSlice";
import api from "../../../redux/api";
import MiniAltitudeChart from "./MiniAltitudeChart";
import AirlineLogo from "./AirlineLogo";

const M_TO_FT = 3.28084;
const MPS_TO_KT = 1.94384;
const MPS_TO_FPM = 196.8504;

interface TelemetryPoint {
  t: number;
  alt: number | null;
}

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

function formatTrailOption(minutes: TrailMinutes): string {
  if (minutes < 60) return `${minutes}m`;
  return `${minutes / 60}h`;
}

function getVerticalRate(rateMps: number | null | undefined) {
  if (rateMps == null) {
    return { value: "N/A", className: "text-[#8B949E]", arrow: "" };
  }
  const fpm = rateMps * MPS_TO_FPM;
  if (fpm > 0) {
    return {
      value: `+${formatNumber(fpm)}`,
      className: "text-[#3FB950]",
      arrow: "↑",
    };
  }
  if (fpm < 0) {
    return {
      value: `${formatNumber(fpm)}`,
      className: "text-[#F85149]",
      arrow: "↓",
    };
  }
  return { value: "0", className: "text-[#8B949E]", arrow: "" };
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
    <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
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

      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-mono text-[11px] tabular-nums text-[#8B949E]">
        {normalized.toFixed(0).padStart(3, "0")}°
      </div>
    </div>
  );
}

function CopyCoordinatesButton({ lat, lon }: { lat: number; lon: number }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      );
      setCopied(true);
    } catch (err) {
      console.warn("[TelemetryPanel] clipboard write failed:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`cursor-pointer px-1.5 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
        copied ? "text-[#3FB950]" : "text-[#6E7681] hover:text-[#8B949E]"
      }`}
      title="Copy coordinates"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function RecentSelections() {
  const dispatch: AppDispatch = useDispatch();
  const recent = useSelector((s: RootState) => s.selection.recent);
  const tracks = useSelector((s: RootState) => s.tracks.tracks);

  const visible = recent.filter((id) => tracks[id]);

  if (visible.length === 0) return null;

  return (
    <div className="w-full px-4 pt-4">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-[#6E7681]">
        Recent
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((id) => {
          const t = tracks[id];
          const label = t.callsign || id;
          return (
            <button
              key={id}
              onClick={() => dispatch(trackSelected(id))}
              className="cursor-pointer rounded-sm border border-[#21262D] px-2 py-1 font-mono text-[11px] text-[#8B949E] transition-colors hover:border-[#30363D] hover:text-[#E6EDF3]"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Panel
export default function TelemetryPanel() {
  const dispatch: AppDispatch = useDispatch();

  const selectedTrack = useSelector((state: RootState) => {
    const id = state.selection.id;
    return id ? state.tracks.tracks[id] : null;
  });
  const following = useSelector((s: RootState) => s.selection.following);
  const trailMinutes = useSelector((s: RootState) => s.selection.trailMinutes);

  const [tick, setTick] = useState(0);
  const [telemetryData, setTelemetryData] = useState<TelemetryPoint[]>([]);

  // Re-render every second to keep "last update" fresh
  useEffect(() => {
    if (!selectedTrack) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [selectedTrack]);

  // Fetch historical altitude data for the chart
  useEffect(() => {
    if (!selectedTrack) {
      setTelemetryData([]);
      return;
    }

    let cancelled = false;
    const selectedId = selectedTrack.id;

    const fetchChartData = () => {
      api
        .get(
          `/api/tracks/${encodeURIComponent(selectedId)}/history?minutes=${trailMinutes}`,
        )
        .then((res) => {
          if (cancelled) return;
          const points: TelemetryPoint[] | undefined =
            res.data?.features?.[0]?.properties?.telemetry;
          setTelemetryData(points ?? []);
        })
        .catch((err) => {
          if (!cancelled) {
            console.warn("[TelemetryPanel] chart fetch failed:", err);
          }
        });
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedTrack?.id, trailMinutes]);

  if (!selectedTrack) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center px-6 py-6 text-center">
        <div className="text-[13px] font-medium text-[#8B949E]">
          No aircraft selected
        </div>
        <p className="mt-2 max-w-48 text-[12px] leading-relaxed text-[#6E7681]">
          Select an aircraft on the map to inspect its telemetry.
        </p>
        <RecentSelections />
      </div>
    );
  }

  void tick;

  const verticalRate = getVerticalRate(selectedTrack.vertical_rate);
  const lastUpdate = formatLastUpdate(selectedTrack.timestamp);
  const isRecent = Math.floor(Date.now() / 1000) - selectedTrack.timestamp < 60;

  const altitudeFt =
    selectedTrack.altitude == null ? null : selectedTrack.altitude * M_TO_FT;
  const speedKt =
    selectedTrack.speed == null ? null : selectedTrack.speed * MPS_TO_KT;

  return (
    <div>
      {/* Identity */}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#6E7681]">
              Aircraft
            </div>
            <div className="flex items-center gap-2">
              <AirlineLogo callsign={selectedTrack.callsign} size={26} />
              <div className="truncate font-mono text-xl font-medium tracking-tight text-[#E6EDF3]">
                {selectedTrack.callsign || "N/A"}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isRecent ? "bg-[#58A6FF]" : "bg-[#6E7681]"
                }`}
              />
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  isRecent ? "text-[#58A6FF]" : "text-[#6E7681]"
                }`}
              >
                {isRecent ? "Live" : "Stale"}
              </span>
            </div>
            <button
              onClick={() => dispatch(followToggled())}
              className={`cursor-pointer rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
                following
                  ? "border-[#58A6FF] bg-[#58A6FF] text-[#0D1117]"
                  : "border-[#30363D] text-[#8B949E] hover:border-[#8B949E] hover:text-[#E6EDF3]"
              }`}
              title={
                following
                  ? "Stop following this aircraft"
                  : "Keep the map centered on this aircraft"
              }
            >
              {following ? "Following" : "Follow"}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-[#21262D]" />

      {/* Primary numbers */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#6E7681]">
              Altitude
            </div>
            <div className="font-mono text-2xl font-medium leading-none tracking-tight text-[#E6EDF3] tabular-nums">
              {formatNumber(altitudeFt)}
              <span className="ml-1 text-[12px] font-normal text-[#8B949E]">
                ft
              </span>
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#6E7681]">
              Ground speed
            </div>
            <div className="font-mono text-2xl font-medium leading-none tracking-tight text-[#E6EDF3] tabular-nums">
              {formatNumber(speedKt)}
              <span className="ml-1 text-[12px] font-normal text-[#8B949E]">
                kt
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4">
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#6E7681]">
              Vertical rate
            </div>
            <div
              className={`flex items-baseline gap-1 font-mono text-[13px] tabular-nums ${verticalRate.className}`}
            >
              {verticalRate.arrow && (
                <span className="text-[11px]">{verticalRate.arrow}</span>
              )}
              <span>{verticalRate.value}</span>
              <span className="text-[10px] text-[#8B949E]">fpm</span>
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#6E7681]">
              Last update
            </div>
            <div className="font-mono text-[13px] tabular-nums text-[#8B949E]">
              {lastUpdate}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-[#21262D]" />

      {/* Altitude chart */}
      <div className="px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[#6E7681]">
            Altitude Profile
          </span>
          <span className="font-mono text-[10px] tabular-nums text-[#6E7681]">
            {formatTrailOption(trailMinutes)}
          </span>
        </div>
        <MiniAltitudeChart data={telemetryData} />
      </div>

      <div className="border-b border-[#21262D]" />

      {/* Heading */}
      <div className="px-4 py-4">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-[#6E7681]">
          Heading
        </div>
        <HeadingIndicator heading={selectedTrack.heading} />
      </div>

      <div className="border-b border-[#21262D]" />

      {/* Position + Trail */}
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[#6E7681]">
            Position
          </span>
          <CopyCoordinatesButton
            lat={selectedTrack.lat}
            lon={selectedTrack.lon}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-[#6E7681]">Latitude</span>
            <span className="font-mono text-[12px] tabular-nums text-[#E6EDF3]">
              {formatCoordinate(selectedTrack.lat, "N", "S")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-[#6E7681]">Longitude</span>
            <span className="font-mono text-[12px] tabular-nums text-[#E6EDF3]">
              {formatCoordinate(selectedTrack.lon, "E", "W")}
            </span>
          </div>
        </div>

        {/* Trail length selector */}
        <div className="mt-5 flex items-center justify-between border-t border-[#21262D] pt-4">
          <span className="text-[10px] uppercase tracking-wider text-[#6E7681]">
            Trail
          </span>
          <div className="flex items-center gap-1">
            {TRAIL_MINUTES_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => dispatch(trailMinutesSet(m))}
                className={`cursor-pointer rounded-sm px-2 py-0.5 font-mono text-[10px] tabular-nums transition-colors ${
                  trailMinutes === m
                    ? "bg-[#21262D] text-[#E6EDF3]"
                    : "text-[#6E7681] hover:text-[#8B949E]"
                }`}
              >
                {formatTrailOption(m)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
