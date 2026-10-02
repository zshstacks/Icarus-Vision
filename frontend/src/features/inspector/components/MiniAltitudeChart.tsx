import { useMemo } from "react";
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const M_TO_FT = 3.28084;

interface Props {
  data: { t: number; alt: number | null }[];
}

export default function MiniAltitudeChart({ data }: Props) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.alt != null)
      .map((d) => ({
        time: d.t,
        altitudeFt: Math.round(d.alt! * M_TO_FT),
      }));
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="flex h-20 items-center justify-center text-[10px] text-[#6E7681]">
        Not enough data for chart
      </div>
    );
  }

  const min = Math.min(...chartData.map((d) => d.altitudeFt));
  const max = Math.max(...chartData.map((d) => d.altitudeFt));

  return (
    <div className="h-20 w-full mt-1 rounded-md  px-1 py-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={[min - 500, max + 500]} hide />
          <Tooltip
            cursor={{ stroke: "#ffffff", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload as { altitudeFt: number };
                return (
                  <div className="rounded border border-[#30363D] bg-[#161B22] px-2 py-1 text-[10px] shadow-lg">
                    <span className="text-[#8B949E]">Alt: </span>
                    <span className="font-mono text-[#E6EDF3]">
                      {p.altitudeFt.toLocaleString("en-US")} ft
                    </span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="altitudeFt"
            stroke="#58A6FF"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
