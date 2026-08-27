export interface tracksType {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number | null;
  on_ground: boolean;
  speed: number | null;
  heading: number | null;
  vertical_rate: number | null;
  timestamp: number;
}

export interface eventType {
  type: "track_update" | "track_removed";
  source: string;
  data: tracksType;
}
