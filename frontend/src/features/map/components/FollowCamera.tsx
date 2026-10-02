import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Map } from "maplibre-gl";
import type { AppDispatch, RootState } from "../../../redux/store";
import { followToggled } from "../../../redux/selectSlice/selectSlice";

interface Props {
  map: Map | null;
}

export default function FollowCamera({ map }: Props) {
  const dispatch: AppDispatch = useDispatch();
  const selectedId = useSelector((s: RootState) => s.selection.id);
  const following = useSelector((s: RootState) => s.selection.following);

  const livePos = useSelector((s: RootState) => {
    if (!s.selection.id) return null;
    const t = s.tracks.tracks[s.selection.id];
    return t ? { lon: t.lon, lat: t.lat } : null;
  });

  const lastFlownRef = useRef<{
    id: string | null;
    lon: number;
    lat: number;
  } | null>(null);

  useEffect(() => {
    if (!map || !following || !livePos || !selectedId) return;

    const last = lastFlownRef.current;
    if (
      last &&
      last.id === selectedId &&
      last.lon === livePos.lon &&
      last.lat === livePos.lat
    ) {
      return;
    }
    lastFlownRef.current = {
      id: selectedId,
      lon: livePos.lon,
      lat: livePos.lat,
    };

    map.easeTo({
      center: [livePos.lon, livePos.lat],
      duration: 800,
      essential: true,
    });
  }, [map, following, livePos, selectedId]);

  useEffect(() => {
    if (!following) lastFlownRef.current = null;
  }, [following]);

  useEffect(() => {
    if (!map || !following) return;

    const onUserDrag = () => dispatch(followToggled());
    map.on("dragstart", onUserDrag);

    return () => {
      map.off("dragstart", onUserDrag);
    };
  }, [map, following, dispatch]);

  return null;
}
