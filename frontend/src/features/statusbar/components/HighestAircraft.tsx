import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";

const M_TO_FT = 3.28084;

export default function HighestAircraft() {
  const tracks = useSelector((s: RootState) => s.tracks.tracks);

  const highest = useMemo(() => {
    let best: { callsign: string; altitudeFt: number } | null = null;

    for (const t of Object.values(tracks)) {
      if (t.on_ground || t.altitude == null) continue;

      const ft = t.altitude * M_TO_FT;
      if (!best || ft > best.altitudeFt) {
        best = { callsign: t.callsign || t.id, altitudeFt: ft };
      }
    }

    return best;
  }, [tracks]);

  if (!highest) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="uppercase tracking-wider">Highest</span>
      <span className="font-mono text-[#E6EDF3]">{highest.callsign}</span>
      <span className="font-mono text-[#8B949E] tabular-nums">
        {Math.round(highest.altitudeFt).toLocaleString("en-US")} ft
      </span>
    </div>
  );
}
