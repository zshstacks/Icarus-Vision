import ConnectionStatus from "./ConnectionStatus";
import FpsCounter from "./FpsCounter";
import LocalTime from "./LocalTime";

export default function StatusBar() {
  return (
    <footer
      className="
        flex h-8 shrink-0 items-center justify-between
        border-t border-[#30363D]/80
        bg-[#161B22]/90 backdrop-blur-md
        px-4 text-[11px] text-[#8B949E]
      "
    >
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 uppercase tracking-wider">
          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider">Delay</span>
          <span className="font-mono text-[#E6EDF3]">120s</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider">FPS</span>
          <FpsCounter />
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono">
        <LocalTime />
      </div>
    </footer>
  );
}
