import { describe, it, expect } from "vitest";
import reducer, {
  trackSelected,
  followToggled,
  trailMinutesSet,
} from "./selectSlice";

const initial = {
  id: null,
  following: false,
  trailMinutes: 60 as const,
  recent: [],
};

describe("selectSlice", () => {
  it("selecting a track sets id and prepends to recent", () => {
    const state = reducer(undefined, trackSelected("abc123"));
    expect(state.id).toBe("abc123");
    expect(state.recent).toEqual(["abc123"]);
  });

  it("re-selecting moves the id to the front (no duplicates)", () => {
    let state = reducer(undefined, trackSelected("a"));
    state = reducer(state, trackSelected("b"));
    state = reducer(state, trackSelected("a"));
    expect(state.recent).toEqual(["a", "b"]);
  });

  it("recent list is capped at 5", () => {
    let state = reducer(undefined, trackSelected("a"));
    for (const id of ["b", "c", "d", "e", "f"]) {
      state = reducer(state, trackSelected(id));
    }
    expect(state.recent).toEqual(["f", "e", "d", "c", "b"]);
  });

  it("deselecting resets following but keeps recent", () => {
    let state = reducer(undefined, trackSelected("a"));
    state = reducer(state, followToggled());
    expect(state.following).toBe(true);

    state = reducer(state, trackSelected(null));
    expect(state.id).toBeNull();
    expect(state.following).toBe(false);
    expect(state.recent).toEqual(["a"]);
  });

  it("followToggled flips the flag", () => {
    let state = reducer(undefined, followToggled());
    expect(state.following).toBe(true);
    state = reducer(state, followToggled());
    expect(state.following).toBe(false);
  });

  it("trailMinutesSet updates the trail window", () => {
    const state = reducer(undefined, trailMinutesSet(360));
    expect(state.trailMinutes).toBe(360);
  });
});

void initial; // reserved for future tests
