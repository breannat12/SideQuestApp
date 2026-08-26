import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CARD, CORAL, DANGER, DARK, LAVENDER, LIGHT, MID, MINT, PEACH, SKY, WHITE } from "../../constants/colors";
import { useFriendRequests } from "../../data/friendRequests";
import { timeAgo, useNotifs } from "../../data/notifs";
import { usePlanFeed } from "../../data/planFeed";
import { acceptSuggestion, clearSuggestion } from "../../data/plans";
import type { Notif, Plan } from "../../types";

/**
 * Every action in this drawer, in one shape — Join, Details, Accept, Decline,
 * Ignore. They sit in the same column at the same width, so a row of them lines
 * up whatever kind of notification it belongs to.
 *
 * The colours are the Explore card's Join button: a pastel tint at rest, the
 * solid colour once the button is doing something. `stop` borrows the cancel
 * button's red for that second state, so declining looks like the destructive
 * action it is right at the moment you commit to it.
 */
const TONES = {
  go:   { rest: { background: MINT  + "20", color: MINT  }, on: { background: MINT,   color: WHITE } },
  stop: { rest: { background: CORAL + "20", color: CORAL }, on: { background: DANGER, color: WHITE } },
  calm: { rest: { background: CARD,         color: MID   }, on: { background: CARD,   color: DARK  } },
} as const;

function RowButton({
  tone, onClick, disabled = false, busy = false, active = false, children,
}: {
  tone: keyof typeof TONES;
  onClick: () => void;
  disabled?: boolean;
  /** Shows an ellipsis and holds the solid state while a write is in flight. */
  busy?: boolean;
  /** A state the button has already put you in — "✓ Joined" rather than "Join". */
  active?: boolean;
  children: React.ReactNode;
}) {
  // Pressed is tracked rather than left to `:active`, because these styles are
  // inline — and it's what gives Decline the cancel-red the moment it's hit,
  // rather than only after the write comes back.
  const [pressed, setPressed] = useState(false);
  const solid = active || busy || pressed;

  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className="py-1.5 rounded-xl text-xs font-extrabold transition-all"
      style={{ ...(solid ? TONES[tone].on : TONES[tone].rest), opacity: busy ? 0.6 : 1 }}>
      {busy ? "…" : children}
    </button>
  );
}

/** The column those buttons stack in. Wide enough for the longest label. */
function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 flex-shrink-0" style={{ width: 78 }}>
      {children}
    </div>
  );
}

export function NotifDrawer({
  onClose, onOpenPlan,
}: {
  onClose: () => void;
  /** Opens the plan behind a row. Closing the drawer is the caller's to do. */
  onOpenPlan?: (plan: Plan) => void;
}) {
  const { notifs, markAllRead } = useNotifs();
  const { accept, ignore, pendingId, error } = useFriendRequests();
  const { friendPlans, isJoined, toggleJoin, pendingId: joinPending, joinError } = usePlanFeed();
  // Exactly which button is mid-write — not just which row. Keyed per button,
  // because a row's two buttons share one write in flight and marking the row
  // busy put the ellipsis on Accept while you were clicking Decline.
  const [busyAction, setBusyAction] = useState("");
  const [answerError, setAnswerError] = useState("");

  const key = (n: Notif, what: string) => `${n.id}|${what}`;
  const rowBusy = (n: Notif) => busyAction.startsWith(`${n.id}|`);

  const answer = async (n: Notif, accept: boolean) => {
    const { planId, entry } = n.suggestion!;
    setBusyAction(key(n, accept ? "accept" : "decline"));
    setAnswerError("");
    try {
      // Accepting moves the plan and clears the suggestion in one write, so the
      // row can never outlive the change it asked for.
      if (accept) await acceptSuggestion(planId, entry);
      else        await clearSuggestion(planId, entry.uid);
    } catch {
      setAnswerError("Couldn't answer that suggestion. Try again.");
    } finally {
      setBusyAction("");
    }
  };

  /** Same, for the two buttons on a friend request. */
  const answerRequest = async (n: Notif, isAccept: boolean) => {
    setBusyAction(key(n, isAccept ? "accept" : "ignore"));
    try {
      if (isAccept) await accept(n.request!);
      else          await ignore(n.request!);
    } finally {
      setBusyAction("");
    }
  };

  // A row about a friend's plan gets to act on it without leaving the drawer.
  // Looked up live rather than carried on the notification, because the RSVP
  // state on the copy `buildNotifs` saw goes stale the moment anyone joins.
  const planFor = (n: Notif): Plan | undefined =>
    n.planId && (n.type === "plan" || n.type === "update")
      ? friendPlans.find((p) => p.id === n.planId)
      : undefined;

  // Everything that was still unread at some point during this viewing. Read
  // receipts land the moment the drawer opens, and without this the rows would
  // lose their tint — and the "N new" chip its number — as you looked at them.
  const highlighted = useRef(new Set<string>());
  for (const n of notifs) if (!n.read) highlighted.current.add(n.id);
  const newCount = notifs.reduce((count, n) => count + (highlighted.current.has(n.id) ? 1 : 0), 0);

  // Opening the drawer is the read receipt, and it re-runs as rows arrive:
  // marking only on mount would miss anything that lands while it's open, and
  // the first paint often beats the plan queries. Marking here rather than on
  // close means the badge clears even if the sheet is dismissed by a back
  // gesture. `markAllRead` no-ops when nothing is new, so this doesn't spin.
  useEffect(() => { markAllRead(); }, [markAllRead]);

  const icon = (type: Notif["type"]) => {
    // COINCIDENCE FEATURE -- icon for the nearby-friend notification kind.
    // if (type === "coincidence") return { bg: SKY + "20", emoji: "⚡" };
    if (type === "request")     return { bg: SKY + "20", emoji: "🙋" };
    if (type === "cancel")      return { bg: DANGER + "20", emoji: "🚫" };
    if (type === "update")      return { bg: PEACH + "40", emoji: "🔁" };
    if (type === "suggest")     return { bg: LAVENDER + "20", emoji: "💡" };
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
            {newCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: CORAL + "20", color: CORAL }}>
                {newCount} new
              </span>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: CARD }}>
              <X size={13} style={{ color: MID }} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {(error || joinError || answerError) && (
            <p className="text-xs font-bold px-5 py-2.5" style={{ color: CORAL }}>
              {error || joinError || answerError}
            </p>
          )}
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 px-8 text-center">
              <span className="text-4xl">🔔</span>
              <p className="text-sm font-extrabold" style={{ color: DARK }}>Nothing yet</p>
              <p className="text-xs leading-relaxed" style={{ color: MID }}>
                You'll hear when someone asks to be friends, when a friend shares or
                moves a plan, or when someone joins one of yours.
              </p>
            </div>
          ) : notifs.map((n) => {
            const s      = icon(n.type);
            const isNew  = highlighted.current.has(n.id);
            const plan   = planFor(n);
            const joined = plan ? isJoined(plan) : false;
            const busy   = plan ? joinPending === plan.id : false;
            return (
              <div key={n.id} className="relative flex items-start gap-3 px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: isNew ? SKY + "06" : WHITE }}>
                {/* The unread marker sits in the row's left padding, centred on
                    its height. Positioned rather than laid out, so an unread row
                    doesn't indent its text a notch further than a read one. */}
                {isNew && (
                  <div className="absolute w-2 h-2 rounded-full"
                    style={{ left: 7, top: "50%", transform: "translateY(-50%)", background: CORAL }} />
                )}
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: s.bg }}>{s.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold leading-tight" style={{ color: DARK }}>{n.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: MID }}>{n.body}</p>
                  <p className="text-xs mt-1" style={{ color: LIGHT }}>{timeAgo(n.at)}</p>

                </div>

                {/* A friend request is the one row that needs an answer.
                    Both buttons remove it — accepting makes the friendship
                    mutual, ignoring just drops the request. */}
                {n.request && (
                  <RowActions>
                    <RowButton tone="go"
                      busy={busyAction === key(n, "accept")}
                      disabled={rowBusy(n) || pendingId === n.request.id}
                      onClick={() => void answerRequest(n, true)}>
                      Accept
                    </RowButton>
                    <RowButton tone="calm"
                      busy={busyAction === key(n, "ignore")}
                      disabled={rowBusy(n) || pendingId === n.request.id}
                      onClick={() => void answerRequest(n, false)}>
                      Ignore
                    </RowButton>
                  </RowActions>
                )}
                {/* Stacked rather than side by side: the column is only as wide
                    as "✓ Joined", and two buttons in a row here would squeeze
                    the title into three lines. */}
                {/* Answering a suggestion, on a plan you host. Accept moves the
                    plan; both clear the suggestion, which is what takes the row
                    away. Tinted rather than solid: white on a pastel green or
                    red doesn't clear the contrast floor, and darker text on the
                    same tint keeps the pastel without losing the label. */}
                {n.suggestion && (
                  <RowActions>
                    <RowButton tone="go"
                      busy={busyAction === key(n, "accept")} disabled={rowBusy(n)}
                      onClick={() => void answer(n, true)}>
                      Accept
                    </RowButton>
                    <RowButton tone="stop"
                      busy={busyAction === key(n, "decline")} disabled={rowBusy(n)}
                      onClick={() => void answer(n, false)}>
                      Decline
                    </RowButton>
                  </RowActions>
                )}

                {plan && (
                  <RowActions>
                    <RowButton tone="go" busy={busy} active={joined}
                      onClick={() => void toggleJoin(plan)}>
                      {joined ? "✓ Joined" : "Join"}
                    </RowButton>
                    <RowButton tone="calm" onClick={() => onOpenPlan?.(plan)}>
                      Details
                    </RowButton>
                  </RowActions>
                )}

              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
