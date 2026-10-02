import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";

export default function StatsGroup() {
  const tracks = useSelector((s: RootState) => s.tracks.tracks);

  const stats = useMemo(() => {
    let airborne = 0;
    let onGround = 0;

    for (const t of Object.values(tracks)) {
      if (t.on_ground) onGround++;
      else airborne++;
    }

    return {
      total: airborne + onGround,
      airborne,
      onGround,
    };
  }, [tracks]);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider">Tracked</span>
        <span className="font-mono text-[#E6EDF3] tabular-nums">
          {stats.total.toLocaleString("en-US")}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider">Airborne</span>
        <span className="font-mono text-[#E6EDF3] tabular-nums">
          {stats.airborne.toLocaleString("en-US")}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider">On ground</span>
        <span className="font-mono text-[#E6EDF3] tabular-nums">
          {stats.onGround.toLocaleString("en-US")}
        </span>
      </div>
    </>
  );
}
