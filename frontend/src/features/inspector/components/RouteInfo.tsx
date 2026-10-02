import { Plane } from "lucide-react";
import { useFlightRoute } from "../../../utility/helpers/useFlightRoute";

interface Props {
  callsign: string | null | undefined;
}

const SHELL_HEIGHT = "h-[68px]";

export default function RouteInfo({ callsign }: Props) {
  const { status, route } = useFlightRoute(callsign);

  if (!callsign) return null;

  if (status === "loading") {
    return (
      <div className={`flex ${SHELL_HEIGHT} items-center justify-center`}>
        <div className="h-3 w-3 animate-pulse rounded-full bg-[#30363D]" />
      </div>
    );
  }

  if (status !== "ready" || !route || !route.origin || !route.destination) {
    return (
      <div
        className={`flex ${SHELL_HEIGHT} items-center justify-center text-[11px] text-[#6E7681]`}
      >
        Route unavailable
      </div>
    );
  }

  const { origin, destination, airline } = route;
  const originLabel = origin.municipality || origin.name;
  const destinationLabel = destination.municipality || destination.name;

  return (
    <div className={SHELL_HEIGHT}>
      <div className="flex h-full items-center justify-between gap-2">
        {/* Origin */}
        <div className="min-w-0 flex-1 text-left">
          <div className="font-mono text-2xl font-medium leading-none tracking-tight text-[#E6EDF3]">
            {origin.iata_code}
          </div>
          <div className="mt-1 truncate text-[11px] text-[#8B949E]">
            {originLabel}
          </div>
        </div>

        {/* Connector */}
        <div className="flex flex-1 items-center gap-1.5 px-1">
          <div className="h-px flex-1 bg-[#30363D]" />
          <Plane
            size={11}
            strokeWidth={1.75}
            className="-rotate-45 text-[#58A6FF]"
          />
          <div className="h-px flex-1 bg-[#30363D]" />
        </div>

        {/* Destination */}
        <div className="min-w-0 flex-1 text-right">
          <div className="font-mono text-2xl font-medium leading-none tracking-tight text-[#E6EDF3]">
            {destination.iata_code}
          </div>
          <div className="mt-1 truncate text-[11px] text-[#8B949E]">
            {destinationLabel}
          </div>
        </div>
      </div>

      {airline?.name && (
        <div className="mt-1 truncate text-center text-[10px] uppercase tracking-wider text-[#6E7681]">
          {airline.name}
        </div>
      )}
    </div>
  );
}
