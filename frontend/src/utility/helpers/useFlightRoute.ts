import { useEffect, useState } from "react";

export interface Airport {
  iata_code: string;
  icao_code: string;
  name: string;
  municipality: string;
  country_name: string;
}

export interface FlightRoute {
  callsign: string;
  airline: { name: string; iata: string; icao: string; country: string } | null;
  origin: Airport | null;
  destination: Airport | null;
}

type Status = "idle" | "loading" | "ready" | "unknown" | "error";

interface State {
  status: Status;
  route: FlightRoute | null;
}

const cache = new Map<string, FlightRoute | null>();

export function useFlightRoute(callsign: string | null | undefined): State {
  const [state, setState] = useState<State>({ status: "idle", route: null });

  useEffect(() => {
    if (!callsign) {
      setState({ status: "idle", route: null });
      return;
    }

    const key = callsign.trim().toUpperCase();

    if (cache.has(key)) {
      const cached = cache.get(key)!;
      setState({ status: cached ? "ready" : "unknown", route: cached });
      return;
    }

    let cancelled = false;
    setState({ status: "loading", route: null });

    fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;

        const route = json?.response?.flightroute as
          | {
              callsign: string;
              airline: FlightRoute["airline"];
              origin: Airport;
              destination: Airport;
            }
          | undefined;

        if (!route || !route.origin || !route.destination) {
          cache.set(key, null);
          setState({ status: "unknown", route: null });
          return;
        }

        const normalized: FlightRoute = {
          callsign: route.callsign,
          airline: route.airline ?? null,
          origin: route.origin,
          destination: route.destination,
        };

        cache.set(key, normalized);
        setState({ status: "ready", route: normalized });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", route: null });
      });

    return () => {
      cancelled = true;
    };
  }, [callsign]);

  return state;
}
