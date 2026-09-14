import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface SelectState {
  id: string | null;
}

const initialState: SelectState = {
  id: null,
};

const selectSlice = createSlice({
  name: "select",
  initialState,
  reducers: {
    trackSelected: (state, action: PayloadAction<string | null>) => {
      state.id = action.payload;
    },
  },
});

export const { trackSelected } = selectSlice.actions;
export default selectSlice.reducer;
