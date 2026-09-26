import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  submitting: boolean;
  error: string | null;
}

const initialState: AuthState = {
  status: "unknown",
  submitting: false,
  error: null,
};

export const checkSession = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("auth/checkSession", async (_, { rejectWithValue }) => {
  try {
    await api.get("/api/me");
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.error ?? "not authenticated");
  }
});

export const login = createAsyncThunk<
  void,
  { username: string; password: string },
  { rejectValue: string }
>("auth/login", async (creds, { rejectWithValue }) => {
  try {
    await api.post("/auth/login", creds);
  } catch (err: any) {
    const msg = err?.response?.data?.error ?? "Login failed";
    return rejectWithValue(msg);
  }
});

export const logout = createAsyncThunk<void, void>("auth/logout", async () => {
  try {
    await api.post("/auth/logout");
  } catch {}
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    forceLogout(state) {
      state.status = "unauthenticated";
      state.error = null;
      state.submitting = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // checkSession
      .addCase(checkSession.fulfilled, (state) => {
        state.status = "authenticated";
      })
      .addCase(checkSession.rejected, (state) => {
        state.status = "unauthenticated";
      })

      // login
      .addCase(login.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state) => {
        state.submitting = false;
        state.status = "authenticated";
      })
      .addCase(login.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload ?? "Login failed";
      })

      // logout
      .addCase(logout.fulfilled, (state) => {
        state.status = "unauthenticated";
        state.error = null;
      });
  },
});

export const { forceLogout } = authSlice.actions;
export default authSlice.reducer;
