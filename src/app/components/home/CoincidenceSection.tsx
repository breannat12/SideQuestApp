import { MapPin, X, Zap } from "lucide-react";
import { useState } from "react";
import { CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { COINCIDENCE_ALERTS } from "../../data/friends";
import { AvatarBubble } from "../common/AvatarBubble";

export function CoincidenceSection() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [pinged, setPinged]       = useState<number[]>([]);
  const visible = COINCIDENCE_ALERTS.filter((a) => !dismissed.includes(a.id));

  if (!visible.length) return null;

  return (
    <div className="mb-1">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Zap size={14} style={{ color: SKY }} />
          <h2 className="text-base font-extrabold" style={{ color: DARK }}>Coincidence Alerts</h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-extrabold"
          style={{ background: CORAL + "20", color: CORAL }}>{visible.length} nearby</span>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {visible.map((a) => {
          const isPinged = pinged.includes(a.id);
          return (
            <div key={a.id}
              className="flex-shrink-0 rounded-3xl p-3.5 flex flex-col gap-2.5"
              style={{
                width: 200,
                background: WHITE,
                border: `1.5px solid ${SKY}30`,
                boxShadow: `0 4px 16px ${SKY}18`,
              }}>
              {/* Top row: avatar + dismiss */}
              <div className="flex items-start justify-between">
                <div className="relative">
                  <div className="p-0.5 rounded-full" style={{ background: MINT + "40" }}>
                    <AvatarBubble i={a.avatar} color={a.avatarColor} size={44} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                    style={{ background: MINT }} />
                </div>
                <button onClick={() => setDismissed((p) => [...p, a.id])}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: CARD }}>
                  <X size={11} style={{ color: LIGHT }} />
                </button>
              </div>

              {/* Info */}
              <div>
                <p className="text-sm font-extrabold leading-tight" style={{ color: DARK }}>{a.name}</p>
                <p className="text-xs mt-0.5" style={{ color: MID }}>{a.status}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <MapPin size={10} style={{ color: SKY }} />
                  <span className="text-xs font-bold" style={{ color: SKY }}>{a.distance} · {a.location}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: LIGHT }}>{a.time}</p>
              </div>

              {/* Action */}
              <button
                onClick={() => setPinged((p) => p.includes(a.id) ? p : [...p, a.id])}
                className="w-full py-2 rounded-xl text-xs font-extrabold text-white transition-all"
                style={{ background: isPinged ? MINT : `linear-gradient(135deg, ${SKY}, ${LAVENDER})` }}>
                {isPinged ? "✓ Pinged!" : "⚡ Ping!"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Divider below section */}
      <div className="mt-4 mb-1">
        <div className="h-px w-full" style={{ background: "rgba(0,0,0,0.07)" }} />
      </div>
    </div>
  );
}
