import { X } from "lucide-react";
import { CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { NOTIFS } from "../../data/notifs";
import type { Notif } from "../../types";

export function NotifDrawer({ onClose }: { onClose: () => void }) {
  const icon = (type: Notif["type"]) => {
    if (type === "coincidence") return { bg: SKY + "20", emoji: "⚡" };
    if (type === "join")        return { bg: MINT + "20", emoji: "✓"  };
    if (type === "ping")        return { bg: CORAL + "20", emoji: "👋" };
    return { bg: LAVENDER + "20", emoji: "📅" };
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="rounded-b-3xl overflow-hidden" style={{ background: WHITE, maxHeight: "78%" }}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <h2 className="text-lg font-extrabold" style={{ color: DARK }}>Notifications</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: CORAL + "20", color: CORAL }}>
              {NOTIFS.filter((n) => !n.read).length} new
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: CARD }}>
              <X size={13} style={{ color: MID }} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {NOTIFS.map((n) => {
            const s = icon(n.type);
            return (
              <div key={n.id} className="flex items-start gap-3 px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: n.read ? WHITE : SKY + "06" }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: s.bg }}>{s.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold leading-tight" style={{ color: DARK }}>{n.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: MID }}>{n.body}</p>
                  <p className="text-xs mt-1" style={{ color: LIGHT }}>{n.time}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: CORAL }} />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}