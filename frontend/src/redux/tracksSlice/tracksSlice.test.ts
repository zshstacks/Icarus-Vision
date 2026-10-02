import { describe, it, expect } from "vitest";
import reducer, { trackUpdated, trackRemoved } from "./tracksSlice";
import type { tracksType } from "../../utility/types/reduxTypes";

function makeTrack(
  id: string,
  overrides: Partial<tracksType> = {},
): tracksType {
  return {
    id,
    callsign: id.toUpperCase(),
    lat: 0,
    lon: 0,
    altitude: 10000,
    on_ground: false,
    speed: 200,
    heading: 90,
    vertical_rate: 0,
    timestamp: 1700000000,
    ...overrides,
  };
}

describe("tracksSlice", () => {
  it("trackUpdated inserts new tracks", () => {
    const state = reducer(
      undefined,
      trackUpdated([makeTrack("a"), makeTrack("b")]),
    );
    expect(Object.keys(state.tracks)).toEqual(["a", "b"]);
  });

  it("trackUpdated overwrites existing tracks (last write wins)", () => {
    let state = reducer(
      undefined,
      trackUpdated([makeTrack("a", { altitude: 1000 })]),
    );
    state = reducer(state, trackUpdated([makeTrack("a", { altitude: 5000 })]));
    expect(state.tracks.a.altitude).toBe(5000);
  });

  it("trackRemoved deletes only the given ids", () => {
    let state = reducer(
      undefined,
      trackUpdated([makeTrack("a"), makeTrack("b"), makeTrack("c")]),
    );
    state = reducer(state, trackRemoved(["b"]));
    expect(Object.keys(state.tracks).sort()).toEqual(["a", "c"]);
  });

  it("trackRemoved on a missing id is a no-op (no throw)", () => {
    const state = reducer(undefined, trackUpdated([makeTrack("a")]));
    expect(() => reducer(state, trackRemoved(["nope"]))).not.toThrow();
  });
});
