import type { Middleware } from "@reduxjs/toolkit";
import {
  trackRemoved,
  trackUpdated,
  connectTracks,
  disconnectTracks,
  reconnectTracks,
} from "./tracksSlice";
import type { eventType, tracksType } from "../../utility/types/reduxTypes";
import { connectionChanged } from "../connectionSlice/connectionSlice";
import api from "../api";

const tracksMiddleware: Middleware = (store) => {
  let ws: WebSocket | null = null;
  let retryDelay = 1000;
  let attemptCounter = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  async function loadSnapshot() {
    try {
      const res = await api.get("/api/tracks");
      const data: tracksType[] = res.data;
      store.dispatch(trackUpdated(data));
    } catch (error) {
      console.warn("[tracksMiddleware] snapshot load failed: ", error);
    }
  }

  function clearRetryTimer() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function teardownSocket() {
    clearRetryTimer();
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
      ws = null;
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
      retryDelay = 1000;
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

  return (next) => (action: any) => {
    if (connectTracks.match(action)) {
      attemptCounter = 0;
      retryDelay = 1000;

      loadSnapshot().then(connect);
    }

    if (disconnectTracks.match(action)) {
      attemptCounter = 0;
      retryDelay = 1000;
      teardownSocket();
      store.dispatch(connectionChanged("disconnected"));
    }

    if (reconnectTracks.match(action)) {
      attemptCounter = 0;
      retryDelay = 1000;
      connect();
    }

    return next(action);
  };
};

export default tracksMiddleware;
