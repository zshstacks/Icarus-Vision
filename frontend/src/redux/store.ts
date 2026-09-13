import { configureStore } from "@reduxjs/toolkit";
import tracksReducer from "./tracksSlice/tracksSlice";
import tracksMiddleware from "./tracksSlice/tracksMiddleware";
import connectionReducer from "./connectionSlice/connectionSlice";

export const store = configureStore({
  reducer: {
    tracks: tracksReducer,
    connection: connectionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tracksMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
