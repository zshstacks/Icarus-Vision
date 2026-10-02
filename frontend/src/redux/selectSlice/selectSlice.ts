import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const TRAIL_MINUTES_OPTIONS = [15, 60, 120, 360] as const;
export type TrailMinutes = (typeof TRAIL_MINUTES_OPTIONS)[number];

interface SelectState {
  id: string | null;
  following: boolean;
  trailMinutes: TrailMinutes;
}

const initialState: SelectState = {
  id: null,
  following: false,
  trailMinutes: 60,
};

const selectSlice = createSlice({
  name: "select",
  initialState,
  reducers: {
    trackSelected: (state, action: PayloadAction<string | null>) => {
      state.id = action.payload;

      if (action.payload === null) {
        state.following = false;
      }
    },
    followToggled: (state) => {
      state.following = !state.following;
    },
    trailMinutesSet: (state, action: PayloadAction<TrailMinutes>) => {
      state.trailMinutes = action.payload;
    },
  },
});

export const { trackSelected, followToggled, trailMinutesSet } =
  selectSlice.actions;
export default selectSlice.reducer;
