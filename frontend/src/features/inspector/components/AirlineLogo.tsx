import { useState } from "react";
import { getAirlineLogoUrl } from "../../../utility/airlines/airlines";

interface Props {
  callsign: string | null | undefined;
  size?: number;
}

export default function AirlineLogo({ callsign, size = 28 }: Props) {
  const [failed, setFailed] = useState(false);
  const url = getAirlineLogoUrl(callsign);

  if (!url || failed) return null;

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-sm bg-white/5 object-contain p-0.5"
      style={{ width: size, height: size }}
    />
  );
}
