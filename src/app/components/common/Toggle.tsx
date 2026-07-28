import { MINT } from "../../constants/colors";

export function Toggle({ on, onToggle, color = MINT }: { on: boolean; onToggle: () => void; color?: string }) {
  return (
    <div onClick={onToggle} className="relative cursor-pointer flex-shrink-0" style={{ width: 44, height: 24 }}>
      <div className="absolute inset-0 rounded-full transition-all" style={{ background: on ? color : "#D1D5DB" }} />
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: on ? "calc(100% - 22px)" : 2 }} />
    </div>
  );
}
