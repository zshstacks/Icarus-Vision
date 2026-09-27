import { HelpCircle, LogOut } from "lucide-react";
import type { AppDispatch } from "../../../redux/store";
import { useDispatch } from "react-redux";
import { logout } from "../../../redux/authSlice/authSlice";
import HelpModal from "./HelpModal";
import { useEffect, useState } from "react";

export default function TopNav() {
  const dispatch: AppDispatch = useDispatch();

  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setHelpOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#30363D]/80 bg-[#161B22]/90 backdrop-blur-md px-4">
        {/* logo and title */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#21262D]">
            {/* logo template */}
            <div className="h-3.5 w-3.5 rotate-45 rounded-sm border-2 border-[#39C5CF]" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#E6EDF3]">
            Icarus Vision
          </span>
        </div>

        {/*  primary navigation */}
        <nav className="flex items-center gap-1">
          <button
            className="
            relative rounded-md px-3 py-1.5 text-[13px] font-medium
            text-[#E6EDF3] bg-[#21262D]
          "
          >
            Map
          </button>
        </nav>

        {/* actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHelpOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3] transition-colors cursor-help"
            title="Help"
          >
            <HelpCircle size={16} strokeWidth={1.75} />
          </button>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#8B949E] hover:bg-[#21262D] hover:text-[#ff0000] transition-colors cursor-pointer"
            onClick={() => {
              dispatch(logout());
            }}
            title="Logout"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>

          {/* user */}
          <div className="ml-2 flex items-center gap-2 rounded-md px-2 py-1 ">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#30363D] text-[11px] font-medium text-[#E6EDF3]">
              Z
            </div>
            <span className="text-[13px] font-medium text-[#E6EDF3]">
              zhstacks
            </span>
          </div>
        </div>
      </header>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
