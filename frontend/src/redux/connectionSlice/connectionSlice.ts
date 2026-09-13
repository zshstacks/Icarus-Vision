import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ConnectionState {
  status: "connected" | "reconnecting" | "disconnected";
}

const initialState: ConnectionState = {
  status: "connected",
};

const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    connectionChanged: (
      state,
      action: PayloadAction<"connected" | "reconnecting" | "disconnected">,
    ) => {
      state.status = action.payload;
    },
  },
});

export const { connectionChanged } = connectionSlice.actions;
export default connectionSlice.reducer;
