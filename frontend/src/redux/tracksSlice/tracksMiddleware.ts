import type { Middleware } from "@reduxjs/toolkit";
import { trackRemoved, trackUpdated } from "./tracksSlice";
import type { eventType } from "../../utility/types/reduxTypes";

//outer layer runs only once when the middlware is registered
const tracksMiddleware: Middleware = (store) => {
  const ws = new WebSocket(import.meta.env.VITE_PUBLIC_WS_API_URL);

  ws.onmessage = (event) => {
    try {
      const parsed: eventType = JSON.parse(event.data as string);

      switch (parsed.type) {
        case "track_update":
          store.dispatch(trackUpdated(parsed.data));
          break;
        case "track_removed":
          store.dispatch(trackRemoved(parsed.data.id));
          break;
        default:
          break;
      }
    } catch (error) {
      console.warn("WebSocket message parse failed or shape mismatch:", error);
    }
  };
  return (next) => (action) => next(action); //middle + inner layers
};

export default tracksMiddleware;
