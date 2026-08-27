import { useSelector } from "react-redux";
import type { RootState } from "./redux/store";

function App() {
  const tracks = useSelector((state: RootState) => state.tracks.tracks);

  console.log("tracks from store:", tracks);

  return (
    <pre style={{ color: "white", background: "#111", padding: 16 }}>
      {JSON.stringify(tracks, null, 2)}
    </pre>
  );
}

export default App;
