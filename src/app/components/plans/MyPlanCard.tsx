import { MapPin, Pencil } from "lucide-react";
import { useState } from "react";
import { CARD, CORAL, DARK, LAVENDER, LIGHT, MID, PEACH, SKY, WHITE } from "../../constants/colors";
import type { Plan } from "../../types";
import { AvatarBubble } from "../common/AvatarBubble";

export function MyPlanCard({ plan, onTap, onSuggest }: { plan: Plan; onTap: () => void; onSuggest: () => void }) {
  const isHost = plan.host === "You";
  const [cancelled, setCancelled] = useState(false);
  const [left, setLeft]           = useState(false);

  if (cancelled || left) return null;

  const tintText = (c: string) => {
    if (c === PEACH)     return "#A07000";
    if (c === "#FFC9DE") return "#B5005B";
    if (c === "#A5D8FF") return "#0070B0";
    return c;
  };

  return (
    <div className="rounded-3xl mb-3 overflow-hidden"
      style={{ background: WHITE, boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)" }}>
      {/* Accent strip — slightly thicker for host plans */}
      <div className="w-full flex items-center" style={{ height: isHost ? 5 : 3, background: `linear-gradient(90deg, ${plan.accentColor}, ${plan.accentColor}60)` }}>
        {isHost && (
          <span className="ml-3 text-xs font-extrabold text-white leading-none" style={{ fontSize: 8, letterSpacing: "0.05em" }}>YOUR PLAN</span>
        )}
      </div>

      <div className="p-4 cursor-pointer" onClick={onTap}>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ width: 54, height: 54, background: plan.accentColor + "22" }}>
            {plan.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm leading-tight" style={{ color: DARK }}>{plan.activity}</h3>
                <p className="text-xs mt-0.5" style={{ color: MID }}>
                  {isHost ? "You're hosting" : `by ${plan.host}`} · {plan.group}
                </p>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: plan.accentColor + "22", color: tintText(plan.accentColor) }}>
                {plan.time}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs" style={{ color: MID }}>
                <MapPin size={10} /> {plan.distance}
              </span>
              <span className="text-xs" style={{ color: LIGHT }}>·</span>
              <span className="text-xs truncate" style={{ color: MID }}>{plan.location}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {plan.attendeeAvatars.slice(0, 3).map((a, idx) => (
                  <div key={idx} className="rounded-full border-2 border-white">
                    <AvatarBubble i={a.initials} color={a.color} size={22} />
                  </div>
                ))}
                {plan.attendees > 3 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold"
                    style={{ background: CARD, color: MID }}>+{plan.attendees - 3}</div>
                )}
              </div>
              <span className="text-xs" style={{ color: MID }}>{plan.attendees} going</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {isHost ? (
            <>
              <button className="flex-1 py-2.5 rounded-2xl text-xs font-extrabold"
                style={{ background: SKY + "18", color: SKY }}>
                ✏️ Edit Plan
              </button>
              <button onClick={(e) => { e.stopPropagation(); onSuggest(); }}
                className="px-3 py-2.5 rounded-2xl text-xs font-bold"
                style={{ background: LAVENDER + "18", color: LAVENDER }}>
                📍 Change
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCancelled(true); }}
                className="px-3 py-2.5 rounded-2xl text-xs font-bold"
                style={{ background: CORAL + "18", color: CORAL }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); onSuggest(); }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-extrabold"
                style={{ background: LAVENDER + "18", color: LAVENDER }}>
                <Pencil size={11} style={{ display: "inline", marginRight: 4 }} />Suggest Change
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLeft(true); }}
                className="px-3 py-2.5 rounded-2xl text-xs font-bold"
                style={{ background: CARD, color: MID }}>
                Leave
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}