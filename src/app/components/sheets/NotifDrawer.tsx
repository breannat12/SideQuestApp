import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { useFriendRequests } from "../../data/friendRequests";
import { timeAgo, useNotifs } from "../../data/notifs";
import type { Notif } from "../../types";

export function NotifDrawer({ onClose }: { onClose: () => void }) {
  const { notifs, markAllRead } = useNotifs();
  const { accept, ignore, pendingId, error } = useFriendRequests();

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
          {error && (
            <p className="text-xs font-bold px-5 py-2.5" style={{ color: CORAL }}>{error}</p>
          )}
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 px-8 text-center">
              <span className="text-4xl">🔔</span>
              <p className="text-sm font-extrabold" style={{ color: DARK }}>Nothing yet</p>
              <p className="text-xs leading-relaxed" style={{ color: MID }}>
                You'll hear when someone asks to be friends, when a friend shares a
                plan, or when someone joins one of yours.
              </p>
            </div>
          ) : notifs.map((n) => {
            const s     = icon(n.type);
            const isNew = highlighted.current.has(n.id);
            return (
              <div key={n.id} className="flex items-start gap-3 px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: isNew ? SKY + "06" : WHITE }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: s.bg }}>{s.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold leading-tight" style={{ color: DARK }}>{n.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: MID }}>{n.body}</p>
                  <p className="text-xs mt-1" style={{ color: LIGHT }}>{timeAgo(n.at)}</p>

                  {/* A friend request is the one row that needs an answer.
                      Both buttons remove it — accepting makes the friendship
                      mutual, ignoring just drops the request. */}
                  {n.request && (
                    <div className="flex gap-2 mt-2.5">
                      <button onClick={() => void accept(n.request!)}
                        disabled={pendingId === n.request.id}
                        className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white transition-all"
                        style={{ background: MINT, opacity: pendingId === n.request.id ? 0.6 : 1 }}>
                        {pendingId === n.request.id ? "…" : "Accept"}
                      </button>
                      <button onClick={() => void ignore(n.request!)}
                        disabled={pendingId === n.request.id}
                        className="px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all"
                        style={{ background: CARD, color: MID, opacity: pendingId === n.request.id ? 0.6 : 1 }}>
                        Ignore
                      </button>
                    </div>
                  )}
                </div>
                {isNew && <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: CORAL }} />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
