import { useEffect, useRef } from "react";
import {
  X,
  HelpCircle,
  Keyboard,
  BookOpen,
  ExternalLink,
  Radar,
  ArrowDown,
  LayoutGrid,
} from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Esc"], label: "Close panels & dialogs" },
  { keys: ["Shift", "Drag"], label: "Box zoom on map" },
];

const RESOURCES: {
  icon: typeof BookOpen;
  label: string;
  hint: string;
  url: string;
}[] = [
  {
    icon: LayoutGrid,
    label: "Portfolio",
    hint: "Check other projects",
    url: "https://zshstacks.vercel.app/",
  },
  {
    icon: BookOpen,
    label: "zshlibrary",
    hint: "Notes & guides on how i build",
    url: "https://zshlibrary.vercel.app/",
  },
];

const PIPELINE: { title: string; detail: string }[] = [
  {
    title: "OpenSky Network",
    detail: "Global ADS-B state vectors, polled every 120s",
  },
  {
    title: "Ingest worker",
    detail: "Normalizes rows → domain.Track, rejects invalid fixes",
  },
  { title: "Broadcaster", detail: "Fan-out to WebSocket hub + Postgres" },
  {
    title: "Live clients",
    detail: "Streamed as track_update / track_removed events",
  },
];

const STACK = [
  "Go",
  "Echo v5",
  "Postgres + PostGIS",
  "WebSocket",
  "React",
  "Redux",
  "MapLibre GL",
  "Tailwind CSS",
];

export default function HelpModal({ open, onClose }: HelpModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-[#0D1117]/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#21262D] px-4 py-3">
          <div className="flex items-center gap-2">
            <HelpCircle
              size={15}
              strokeWidth={1.75}
              className="text-[#39C5CF]"
            />
            <h2
              id="help-modal-title"
              className="text-[13px] font-semibold tracking-tight text-[#E6EDF3]"
            >
              About Icarus Vision
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B949E] transition-colors hover:bg-[#21262D] hover:text-[#E6EDF3] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#39C5CF]"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          {/* about */}
          <section>
            <div className="flex items-center gap-1.5">
              <Radar size={13} strokeWidth={1.75} className="text-[#6E7681]" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">
                What is this
              </span>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#C9D1D9]">
              A real-time map of aircraft tracked worldwide, built from live
              ADS-B state vectors published by the OpenSky Network. Click any
              aircraft to inspect its telemetry - callsign, altitude, speed,
              heading and vertical rate. Positions refresh roughly every two
              minutes, trading real-time smoothness for a global, predictable
              feed.
            </p>
          </section>

          <div className="h-px bg-[#21262D]" />

          {/* how it works */}
          <section>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">
              How it works
            </span>

            <ol className="mt-3 flex flex-col">
              {PIPELINE.map(({ title, detail }, i) => (
                <li key={title} className="flex flex-col">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#30363D] bg-[#21262D] text-[9px] font-medium text-[#8B949E]">
                      {i + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[12.5px] font-medium text-[#E6EDF3]">
                        {title}
                      </span>
                      <span className="text-[11px] leading-snug text-[#6E7681]">
                        {detail}
                      </span>
                    </div>
                  </div>

                  {i < PIPELINE.length - 1 && (
                    <div className="flex h-4 w-4 items-center justify-center">
                      <ArrowDown
                        size={11}
                        strokeWidth={2}
                        className="text-[#30363D]"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <div className="h-px bg-[#21262D]" />

          {/* stack */}
          <section>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">
              Built with
            </span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-[#30363D] bg-[#21262D] px-2 py-0.5 text-[11px] text-[#C9D1D9]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          <div className="h-px bg-[#21262D]" />

          {/* shortcuts */}
          <section>
            <div className="flex items-center gap-1.5">
              <Keyboard
                size={13}
                strokeWidth={1.75}
                className="text-[#6E7681]"
              />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">
                Keyboard shortcuts
              </span>
            </div>

            <ul className="mt-3 flex flex-col gap-1">
              {SHORTCUTS.map(({ keys, label }) => (
                <li
                  key={label}
                  className="flex items-center justify-between rounded-md px-1.5 py-1"
                >
                  <span className="text-[12.5px] text-[#C9D1D9]">{label}</span>
                  <span className="flex items-center gap-1">
                    {keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded border border-[#30363D] bg-[#21262D] px-1.5 py-0.5 font-sans text-[11px] leading-none text-[#8B949E]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="h-px bg-[#21262D]" />

          {/* resources */}
          <section>
            <div className="flex items-center gap-1.5">
              <BookOpen
                size={13}
                strokeWidth={1.75}
                className="text-[#6E7681]"
              />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E7681]">
                Resources
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              {RESOURCES.map(({ icon: Icon, label, hint, url }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    window.open(url, "_blank", "noopener,noreferrer")
                  }
                  className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[#21262D] cursor-pointer"
                >
                  <Icon
                    size={14}
                    strokeWidth={1.75}
                    className="shrink-0 text-[#8B949E] group-hover:text-[#39C5CF]"
                  />
                  <span className="flex flex-1 flex-col">
                    <span className="text-[12.5px] font-medium text-[#E6EDF3]">
                      {label}
                    </span>
                    <span className="text-[11px] leading-snug text-[#6E7681]">
                      {hint}
                    </span>
                  </span>
                  <ExternalLink
                    size={12}
                    strokeWidth={1.75}
                    className="shrink-0 text-[#484F58] group-hover:text-[#8B949E]"
                  />
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end border-t border-[#21262D] bg-[#0D1117]/40 px-4 py-2.5">
          <button
            onClick={onClose}
            className="rounded-md border border-[#30363D] bg-[#21262D] px-2.5 py-1 text-[11.5px] font-medium text-[#E6EDF3] transition-colors hover:border-[#484F58] hover:bg-[#30363D]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
