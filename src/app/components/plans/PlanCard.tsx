import { MapPin, Pencil } from "lucide-react";
import { useState } from "react";
import { CARD, DARK, LAVENDER, MID, MINT, PEACH, WHITE } from "../../constants/colors";
import { locationLine } from "../../data/plans";
import type { Plan } from "../../types";
import { AvatarBubble } from "../common/AvatarBubble";


/**
 * Marks a plan whose host is open to moving it. One tag for the whole plan,
 * next to its name — which half is flexible is a detail for the sheet, and
 * marking each one separately put two identical chips on the same card.
 */
function FlexChip() {
  return (
    <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0"
      style={{ background: MINT + "22", color: "#3E9E6E", fontSize: 10 }}>
      flexible
    </span>
  );
}

export function PlanCard({
  plan, onTap, compact = false, onJoin, joined = false, pending = false, onSuggest,
}: {
  plan: Plan;
  onTap?: () => void;
  compact?: boolean;
  /** Offered only on a plan its host marked flexible, and never on your own. */
  onSuggest?: () => void;
  /** Given only for real plans — seeded ones have no document to RSVP against. */
  onJoin?: () => void;
  joined?: boolean;
  /** The RSVP write is in flight; the button holds still rather than flickering. */
  pending?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const tintText = (c: string) => {
    if (c === PEACH)     return "#A07000";
    if (c === "#FFC9DE") return "#B5005B";
    if (c === "#A5D8FF") return "#0070B0";
    return c;
  };

  const joinLabel = pending ? "…" : joined ? "✓ Joined!" : "Join";

  return (
    <div className="rounded-3xl mb-3 overflow-hidden"
      style={{ background: WHITE, boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)" }}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${plan.accentColor}, ${plan.accentColor}60)` }} />
      <div className="p-4" onClick={onTap} style={{ cursor: onTap ? "pointer" : "default" }}>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ width: 54, height: 54, background: plan.accentColor + "22" }}>
            {plan.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="font-extrabold text-sm leading-tight truncate" style={{ color: DARK }}>{plan.activity}</h3>
                  {(plan.flexTime || plan.flexLoc) && <FlexChip />}
                </div>
                {/* Who, but not which group they sent it to. The group is the
                    host's own shorthand for a slice of their friends list, and
                    naming it here would tell you how they've filed you. This
                    card only ever shows a plan someone else hosts. */}
                <p className="text-xs mt-0.5" style={{ color: MID }}>by {plan.host}</p>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: plan.accentColor + "22", color: tintText(plan.accentColor) }}>
                {plan.time}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {/* Place first, then how far it is — "Blue Bottle · 0.3 mi". The
                  distance is appended by `locationLine`, which leaves it off
                  where it wouldn't mean anything. */}
              <span className="flex items-center gap-1 text-xs truncate" style={{ color: MID }}>
                <MapPin size={10} className="flex-shrink-0" /> {locationLine(plan)}
              </span>
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

              {/* Compact cards keep the RSVP inline: Explore is a scanning list,
                  and a full button row per card would halve how many fit. */}
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                {compact && onSuggest && (
                  <button onClick={(e) => { e.stopPropagation(); onSuggest(); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-extrabold transition-all"
                    style={{ background: LAVENDER + "22", color: "#6D4FD8" }}>
                    <Pencil size={10} /> Suggest
                  </button>
                )}
                {compact && onJoin && (
                  <button onClick={(e) => { e.stopPropagation(); onJoin(); }} disabled={pending}
                    className="px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all"
                    style={{ background: joined ? MINT : MINT + "20", color: joined ? WHITE : MINT, opacity: pending ? 0.6 : 1 }}>
                    {joinLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="flex gap-2 mt-3">
            <button onClick={(e) => { e.stopPropagation(); onJoin?.(); }} disabled={pending || !onJoin}
              className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold transition-all"
              style={{ background: joined ? MINT : MINT + "20", color: joined ? WHITE : MINT, opacity: pending ? 0.6 : 1 }}>
              {joinLabel}
            </button>
            {onSuggest && (
              <button onClick={(e) => { e.stopPropagation(); onSuggest(); }}
                className="px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1"
                style={{ background: LAVENDER + "18", color: "#6D4FD8" }}>
                <Pencil size={11} /> Suggest
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="px-3 py-2.5 rounded-2xl text-xs font-bold"
              style={{ background: CARD, color: MID }}>
              Next Time
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
