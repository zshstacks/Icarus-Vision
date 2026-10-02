import { describe, it, expect } from "vitest";
import findTrack from "./findTrack";
import type { tracksType } from "../types/reduxTypes";

function t(id: string, callsign: string): tracksType {
  return {
    id,
    callsign,
    lat: 0,
    lon: 0,
    altitude: null,
    on_ground: false,
    speed: null,
    heading: null,
    vertical_rate: null,
    timestamp: 0,
  };
}

const tracks: Record<string, tracksType> = {
  abc123: t("abc123", "UAL123"),
  def456: t("def456", "BAW99"),
};

describe("findTrack", () => {
  it("finds by exact id", () => {
    expect(findTrack(tracks, "abc123")?.id).toBe("abc123");
  });

  it("finds by callsign (case-insensitive, trimmed)", () => {
    expect(findTrack(tracks, "  ual123  ")?.id).toBe("abc123");
  });

  it("returns null on empty query", () => {
    expect(findTrack(tracks, "   ")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(findTrack(tracks, "zzz")).toBeNull();
  });
});
