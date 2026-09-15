import type { tracksType } from "../types/reduxTypes";

export default function findTrack(
  tracks: Record<string, tracksType>,
  query: string,
): tracksType | null {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return null;

  //exact id match
  if (tracks[normalized]) return tracks[normalized];

  //case-insensitive scan
  const match = Object.values(tracks).find(
    (t) => t.callsign?.trim().toLowerCase() === normalized,
  );

  return match ?? null;
}
