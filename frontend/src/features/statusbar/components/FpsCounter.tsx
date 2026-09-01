import { useEffect, useRef, useState } from "react";

export default function FpsCounter() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let rafId: number;

    const loop = (now: number) => {
      frames.current += 1;

      if (now - lastTime.current >= 1000) {
        setFps(frames.current);
        frames.current = 0;
        lastTime.current = now;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return <div className="font-mono text-[#E6EDF3]">{fps}</div>;
}
