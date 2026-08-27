import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { tracksType } from "../../utility/types/reduxTypes";

interface TracksState {
  tracks: Record<string, tracksType>;
}

const initialState: TracksState = {
  tracks: {},
};

const tracksSlice = createSlice({
  name: "tracks",
  initialState,
  reducers: {
    trackUpdated: (state, action: PayloadAction<tracksType>) => {
      state.tracks[action.payload.id] = action.payload;
    },
    trackRemoved: (state, action: PayloadAction<string>) => {
      delete state.tracks[action.payload];
    },
  },
});

export const { trackUpdated, trackRemoved } = tracksSlice.actions;
export default tracksSlice.reducer;
