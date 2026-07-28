import { LIGHT } from "../../constants/colors";

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
      <span className="text-xs font-extrabold tracking-wider uppercase" style={{ color: LIGHT }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
    </div>
  );
}
