import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../redux/store";
import { RotateCcw } from "lucide-react";
const statusConfig = {
  connected: {
    label: "Connected",
    className: "text-[#3FB950] ",
  },
  reconnecting: {
    label: "Reconnecting",
    className: "text-[#D29922] ",
  },
  disconnected: {
    label: "Disconnected",
    className: "text-[#F85149] ",
  },
} as const;

export default function ConnectionStatus() {
  const status = useSelector((state: RootState) => state.connection.status);
  const dispatch: AppDispatch = useDispatch();

  const { label, className } = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded  text-[11px] font-medium uppercase tracking-wider ${className}`}
      >
        {label}
      </span>

      {status === "disconnected" && (
        <button
          type="button"
          onClick={() => dispatch({ type: "tracks/reconnectRequested" })}
          className="rounded cursor-pointer uppercase tracking-wider text-[#F85149] transition-colors hover:text-[#FF7B72]"
        >
          <RotateCcw size={18} />
        </button>
      )}
    </div>
  );
}
