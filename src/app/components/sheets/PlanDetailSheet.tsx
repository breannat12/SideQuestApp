import { Clock, MapPin, MessageCircle, Pencil, Users, X } from "lucide-react";
import { CARD, CORAL, DANGER, DARK, LAVENDER, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { locationLabel } from "../../data/plans";
import { usePlanFeed } from "../../data/planFeed";
import type { Plan } from "../../types";
import { AvatarBubble } from "../common/AvatarBubble";

export function PlanDetailSheet({ plan: opened, onClose, onEdit, onSuggest }: {
  plan: Plan; onClose: () => void; onEdit: () => void;
  /** Opens the suggestion sheet, on someone else's flexible plan. */
  onSuggest?: () => void;
}) {
  const { isJoined, latest, pendingId, toggleJoin, joinError } = usePlanFeed();
  // The sheet was handed a copy at tap time. Re-resolving keeps the roster and
  // the Join button honest while it's open — a friend joining shows up here.
  const plan = latest(opened);

  const joined  = isJoined(plan);
  const pending = pendingId === plan.id;
  // The host is already on the roster, and letting them leave would strand
  // everyone else on a plan with nobody running it. A plan called off while
  // this sheet was open isn't joinable by anyone.
  const canJoin = plan.host !== "You" && !plan.cancelled;
  // This sheet opens over Explore and the notification drawer as well as Home,
  // so the group line has to be earned rather than assumed.
  const isHost  = plan.host === "You";
  /** What the host left open to suggestions, if anything. */
  const flexible = [plan.flexTime && "time", plan.flexLoc && "place"].filter(Boolean) as string[];
  const canSuggest = !isHost && flexible.length > 0 && !plan.cancelled && Boolean(onSuggest);

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
            <p className="text-sm mt-1" style={{ color: MID }}>{locationLabel(plan)}</p>
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
                <p className="text-xs" style={{ color: MID }}>
                  {isHost ? `Organizer · ${plan.group}` : "Organizer"}
                </p>
              </div>
              <button className="ml-auto p-2 rounded-xl" style={{ background: SKY + "20" }}>
                <MessageCircle size={15} style={{ color: SKY }} />
              </button>
            </div>
            {/* Says which parts can move, and offers the way to move them.
                Without the first half the button is an invitation with no
                subject — "suggest a change" to what? */}
            {canSuggest && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl"
                style={{ background: MINT + "12", border: `1.5px solid ${MINT}35` }}>
                <span className="text-base">🌀</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold" style={{ color: DARK }}>
                    {flexible.join(" and ")} {flexible.length > 1 ? "are" : "is"} flexible
                  </p>
                  <p className="text-xs" style={{ color: MID }}>
                    {plan.host} is open to another {flexible.join(" or ")}.
                  </p>
                </div>
                <button onClick={onSuggest}
                  className="px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 flex-shrink-0"
                  style={{ background: LAVENDER + "25", color: "#6D4FD8" }}>
                  <Pencil size={11} /> Suggest
                </button>
              </div>
            )}

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
            {plan.cancelled && (
              <p className="text-sm font-extrabold text-center mb-3 py-2.5 rounded-2xl"
                style={{ background: DANGER + "18", color: DANGER }}>
                🚫 {plan.host} cancelled this sidequest
              </p>
            )}
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
                {pending ? "…" : joined ? (canJoin ? "✓ You're In! · Tap to leave" : "✓ You're hosting") : "Join Sidequest"}
              </button>
              {/* Edit is the host's. Everyone else gets the Suggest button in
                  the flexible panel above, when the host left one open. */}
              {plan.host === "You" && (
                <button onClick={onEdit}
                  className="px-4 py-3.5 rounded-2xl font-extrabold text-sm flex items-center gap-1.5"
                  style={{ background: LAVENDER + "20", color: LAVENDER }}>
                  <Pencil size={14} /> Edit
                </button>
              )}
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