import { configureStore } from "@reduxjs/toolkit";
import tracksReducer from "./tracksSlice/tracksSlice";
import tracksMiddleware from "./tracksSlice/tracksMiddleware";
import connectionReducer from "./connectionSlice/connectionSlice";
import selectReducer from "./selectSlice/selectSlice";
import { setUnauthorizedHandler } from "./api";
import authReducer, { forceLogout } from "./authSlice/authSlice";

export const store = configureStore({
  reducer: {
    tracks: tracksReducer,
    connection: connectionReducer,
    selection: selectReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tracksMiddleware),
});

setUnauthorizedHandler(() => {
  store.dispatch(forceLogout());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
