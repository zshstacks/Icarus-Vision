import { configureStore } from "@reduxjs/toolkit";
import tracksReducer from "./tracksSlice/tracksSlice";
import tracksMiddleware from "./tracksSlice/tracksMiddleware";

export const store = configureStore({
  reducer: {
    tracks: tracksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tracksMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
