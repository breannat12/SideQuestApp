import { MapPin, Pencil } from "lucide-react";
import { CARD, DANGER, DARK, LAVENDER, MID, MINT, PEACH, SKY, WHITE } from "../../constants/colors";
import { usePlanFeed } from "../../data/planFeed";
import { locationLine } from "../../data/plans";
import type { Plan } from "../../types";
import { AvatarBubble } from "../common/AvatarBubble";


/** Same marker as the Explore card — see `FlexChip` there for the reasoning. */
function FlexChip() {
  return (
    <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0"
      style={{ background: MINT + "22", color: "#3E9E6E", fontSize: 10 }}>
      flexible
    </span>
  );
}

export function MyPlanCard({ plan, onTap, onEdit, onCancel, onSuggest }: {
  plan: Plan;
  onTap: () => void;
  onEdit: () => void;
  /** Offered on a plan you joined that its host marked flexible. */
  onSuggest?: () => void;
  /** Opens the confirmation dialog. Cancelling itself happens there. */
  onCancel: () => void;
}) {
  const { toggleJoin, pendingId } = usePlanFeed();
  const isHost  = plan.host === "You";
  const leaving = pendingId === plan.id;

  // Neither button hides the card by itself any more. Both write, and the card
  // goes when the snapshot says it has — which is also what makes it disappear
  // on your other devices, and on everyone else's.

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
      <div className="w-full" style={{ height: isHost ? 5 : 3, background: `linear-gradient(90deg, ${plan.accentColor}, ${plan.accentColor}60)` }} />

      <div className="p-4 cursor-pointer" onClick={onTap}>
        <div className="flex items-start gap-3">
          {/* The host marker is the brand gradient rather than the plan's own
              accent, so "yours" reads the same on every card instead of
              blending into whatever colour that plan happens to use. */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="rounded-2xl flex items-center justify-center text-2xl"
              style={{ width: 54, height: 54, background: plan.accentColor + "22" }}>
              {plan.emoji}
            </div>
            {isHost && (
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})`,
                  color: WHITE,
                  boxShadow: `0 2px 6px ${SKY}55`,
                }}>
                Your Sidequest!
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="font-extrabold text-sm leading-tight truncate" style={{ color: DARK }}>{plan.activity}</h3>
                  {(plan.flexTime || plan.flexLoc) && <FlexChip />}
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: MID }}>
                  {/* Your own plan says who you sent it to. A plan you joined
                      names its host and stops there — whose group you're in is
                      theirs to know, not yours. */}
                  {isHost ? plan.group : `by ${plan.host}`}
                </p>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: plan.accentColor + "22", color: tintText(plan.accentColor) }}>
                {plan.time}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {/* Place first, then how far it is — "Blue Bottle · 0.3 mi". */}
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
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {isHost ? (
            <>
              {/* Same shape as Suggest below — a drawn pencil rather than the
                  emoji, which rendered at the platform's own size and colour
                  and so refused to match anything around it. The icon takes
                  `currentColor`, so it picks up the blue from `color`. */}
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1"
                style={{ background: SKY + "18", color: SKY }}>
                <Pencil size={11} /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="px-4 py-2.5 rounded-2xl text-xs font-extrabold"
                style={{ background: DANGER, color: WHITE }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {/* Back where it used to sit, but earned rather than always on:
                  only a plan whose host marked something flexible offers it. */}
              {onSuggest && (
                <button onClick={(e) => { e.stopPropagation(); onSuggest(); }}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1"
                  style={{ background: LAVENDER + "22", color: "#6D4FD8" }}>
                  <Pencil size={11} /> Suggest
                </button>
              )}
              {/* Sized like Cancel rather than stretched: both are the same
                  kind of action, and `ml-auto` keeps this one on the right edge
                  even when there's no Suggest beside it to push it there. */}
              <button onClick={(e) => { e.stopPropagation(); void toggleJoin(plan); }} disabled={leaving}
                className="px-4 py-2.5 rounded-2xl text-xs font-extrabold ml-auto"
                style={{ background: DANGER, color: WHITE, opacity: leaving ? 0.6 : 1 }}>
                {leaving ? "Leaving…" : "Leave"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}