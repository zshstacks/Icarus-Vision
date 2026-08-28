const sections = [
  {
    title: "Airspace",
    items: [
      { label: "Flight Tracks", checked: true },
      { label: "Aircraft", checked: true },
      { label: "Airports", checked: true },
      { label: "Airspace Boundaries", checked: false },
    ],
  },
  {
    title: "Environment",
    items: [
      { label: "Weather Radar", checked: false },
      { label: "SIGMET", checked: false },
      { label: "NOTAMs", checked: false },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { label: "Airports", checked: true },
      { label: "Navaids", checked: false },
      { label: "Sectors", checked: false },
    ],
  },
];

export default function LayerTree() {
  return (
    <div className="border-b border-[#30363D]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold tracking-wider text-[#8B949E]">
          LAYERS
        </span>
        <button className="text-[#6E7681] hover:text-[#E6EDF3]">▴</button>
      </div>

      <div className="space-y-4 px-4 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#8B949E]">
              <span className="text-[10px]">▾</span>
              {section.title}
            </div>
            <ul className="space-y-1 pl-3">
              {section.items.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked={item.checked}
                    className="h-3.5 w-3.5 rounded border-[#30363D] bg-[#0D1117] text-[#39C5CF] accent-[#39C5CF]"
                    readOnly
                  />
                  <span className="text-sm text-[#E6EDF3]">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
