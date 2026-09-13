import type { Middleware } from "@reduxjs/toolkit";
import { trackRemoved, trackUpdated } from "./tracksSlice";
import type { eventType } from "../../utility/types/reduxTypes";
import { connectionChanged } from "../connectionSlice/connectionSlice";

//outer layer runs only once when the middlware is registered
const tracksMiddleware: Middleware = (store) => {
  let ws: WebSocket | null = null;
  let retryDelay = 1000;
  let attemptCounter = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function clearRetryTimer() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function connect() {
    clearRetryTimer();

    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
      ws = null;
    }

    ws = new WebSocket(import.meta.env.VITE_PUBLIC_WS_API_URL);

    ws.onmessage = (event) => {
      try {
        const parsed: eventType = JSON.parse(event.data as string);

        switch (parsed.type) {
          case "track_update":
            store.dispatch(trackUpdated(parsed.data));
            break;
          case "track_removed":
            store.dispatch(trackRemoved(parsed.data.map((track) => track.id)));
            break;
          default:
            break;
        }
      } catch (error) {
        console.warn(
          "WebSocket message parse failed or shape mismatch:",
          error,
        );
      }
    };

    ws.onopen = () => {
      clearRetryTimer();
      retryDelay = 1000; //reset when user actually connected
      attemptCounter = 0;
      store.dispatch(connectionChanged("connected"));
    };

    ws.onclose = () => {
      attemptCounter++;

      if (attemptCounter >= 6) {
        store.dispatch(connectionChanged("disconnected"));
      } else {
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
        store.dispatch(connectionChanged("reconnecting"));
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return (next) => (action: any) => {
    if (action.type === "tracks/reconnectRequested") {
      attemptCounter = 0; //user manuall attempts
      retryDelay = 1000;
      connect();
    }
    return next(action); //middle + inner layers
  };
};

export default tracksMiddleware;
