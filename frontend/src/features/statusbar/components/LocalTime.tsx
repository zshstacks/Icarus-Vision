import { useEffect, useState } from "react";

export default function LocalTime() {
  const [time, setTime] = useState(() => formatLocalTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setTime(formatLocalTime(new Date()));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return <span>{time}</span>;
}

function formatLocalTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}
