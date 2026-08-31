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
    trackUpdated: (state, action: PayloadAction<tracksType[]>) => {
      action.payload.forEach((track) => {
        state.tracks[track.id] = track;
      });
    },
    trackRemoved: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((track) => {
        delete state.tracks[track];
      });
    },
  },
});

export const { trackUpdated, trackRemoved } = tracksSlice.actions;
export default tracksSlice.reducer;
