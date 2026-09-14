import { configureStore } from "@reduxjs/toolkit";
import tracksReducer from "./tracksSlice/tracksSlice";
import tracksMiddleware from "./tracksSlice/tracksMiddleware";
import connectionReducer from "./connectionSlice/connectionSlice";
import selectReducer from "./selectSlice/selectSlice";

export const store = configureStore({
  reducer: {
    tracks: tracksReducer,
    connection: connectionReducer,
    selection: selectReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tracksMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
