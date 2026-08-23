import { Clock, MapPin, MessageCircle, Pencil, Share2, Users, X } from "lucide-react";
import { CARD, CORAL, DARK, LAVENDER, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { usePlanFeed } from "../../data/planFeed";
import type { Plan } from "../../types";
import { AvatarBubble } from "../common/AvatarBubble";

// SUGGEST CHANGES CODE: `onSuggest` opened the edit sheet for a plan you host
// and the suggestion sheet for anyone else's. Edit-only now, hence the rename.
export function PlanDetailSheet({ plan: opened, onClose, onEdit }: { plan: Plan; onClose: () => void; onEdit: () => void }) {
  const { isJoined, latest, pendingId, toggleJoin, joinError } = usePlanFeed();
  // The sheet was handed a copy at tap time. Re-resolving keeps the roster and
  // the Join button honest while it's open — a friend joining shows up here.
  const plan = latest(opened);

  const joined  = isJoined(plan);
  const pending = pendingId === plan.id;
  // The host is already on the roster, and letting them leave would strand
  // everyone else on a plan with nobody running it.
  const canJoin = plan.host !== "You";

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="rounded-t-3xl overflow-hidden flex flex-col" style={{ background: WHITE, maxHeight: "88%" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: CARD }} />
        </div>
        <div className="overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="mx-4 mt-2 rounded-3xl flex flex-col items-center justify-center py-8"
            style={{ background: plan.accentColor + "18" }}>
            <div className="text-6xl mb-2">{plan.emoji}</div>
            <h2 className="text-xl font-extrabold" style={{ color: DARK }}>{plan.activity}</h2>
            <p className="text-sm mt-1" style={{ color: MID }}>{plan.location}</p>
          </div>
          <div className="px-5 pt-4 pb-8">
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { icon: Clock, label: "Time", value: plan.time },
                // Saved plans have no distance behind them yet — show a dash
                // rather than an empty tile in the middle of the row.
                { icon: MapPin, label: "Distance", value: plan.distance ?? "—" },
                { icon: Users, label: "Going", value: `${plan.attendees} people` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl p-3 text-center" style={{ background: CARD }}>
                  <Icon size={16} style={{ color: MID, margin: "0 auto 4px" }} />
                  <p className="text-xs font-bold" style={{ color: DARK }}>{value}</p>
                  <p className="text-xs" style={{ color: MID }}>{label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl" style={{ background: CARD }}>
              <AvatarBubble i={plan.avatar} color={plan.avatarColor} size={40} />
              <div>
                <p className="text-sm font-extrabold" style={{ color: DARK }}>{plan.host}</p>
                <p className="text-xs" style={{ color: MID }}>Organizer · {plan.group}</p>
              </div>
              <button className="ml-auto p-2 rounded-xl" style={{ background: SKY + "20" }}>
                <MessageCircle size={15} style={{ color: SKY }} />
              </button>
            </div>
            {plan.description && (
              <p className="text-sm mb-4 leading-relaxed" style={{ color: MID }}>"{plan.description}"</p>
            )}
            <div className="mb-5">
              <p className="text-sm font-extrabold mb-3" style={{ color: DARK }}>Who's going</p>
              <div className="flex flex-wrap gap-2">
                {plan.attendeeAvatars.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: a.color + "20" }}>
                    <AvatarBubble i={a.initials} color={a.color} size={20} />
                    {/* A real plan knows who these people are; a seeded one only
                        has initials, so fall back to the bubble's own letters. */}
                    <span className="text-xs font-bold" style={{ color: DARK }}>
                      {plan.roster?.[i]?.name || a.initials}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {joinError && (
              <p className="text-xs font-bold text-center mb-3" style={{ color: CORAL }}>{joinError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => void toggleJoin(plan)} disabled={!canJoin || pending}
                className="flex-1 py-3.5 rounded-2xl font-extrabold text-base text-white transition-all"
                style={{
                  background: joined ? MINT : `linear-gradient(135deg, ${MINT}, ${SKY})`,
                  opacity: canJoin && !pending ? 1 : 0.6,
                }}>
                {pending ? "…" : joined ? (canJoin ? "✓ You're In! · Tap to leave" : "✓ You're hosting") : "Join Plan"}
              </button>
              {/* SUGGEST CHANGES CODE: this button showed for everyone, reading
                  "Edit" on your own plan and "Suggest" on someone else's. It's
                  the host's alone now — restore by dropping the guard and
                  putting the label back to:
                    {plan.host === "You" ? "Edit" : "Suggest"} */}
              {plan.host === "You" && (
                <button onClick={onEdit}
                  className="px-4 py-3.5 rounded-2xl font-extrabold text-sm flex items-center gap-1.5"
                  style={{ background: LAVENDER + "20", color: LAVENDER }}>
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button className="w-12 h-12 rounded-2xl flex items-center justify-center self-center"
                style={{ background: CARD }}>
                <Share2 size={17} style={{ color: MID }} />
              </button>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: CARD }}>
          <X size={15} style={{ color: MID }} />
        </button>
      </div>
    </div>
  );
}