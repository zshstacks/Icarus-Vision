import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AppShell from "./shared/layouts/AppShell";
import Login from "./features/auth/components/Login";
import { checkSession } from "./redux/authSlice/authSlice";
import {
  connectTracks,
  disconnectTracks,
} from "./redux/tracksSlice/tracksSlice";
import type { AppDispatch, RootState } from "./redux/store";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((s: RootState) => s.auth.status);

  useEffect(() => {
    dispatch(checkSession());
  }, [dispatch]);

  useEffect(() => {
    if (status === "authenticated") {
      dispatch(connectTracks());
      return () => {
        dispatch(disconnectTracks());
      };
    }
  }, [status, dispatch]);

  if (status === "unknown") {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center text-[#6E7681] text-sm font-sans">
        Checking session…
      </div>
    );
  }

  return status === "authenticated" ? <AppShell /> : <Login />;
}

export default App;
