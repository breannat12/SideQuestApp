import { Bell } from "lucide-react";
import { MyPlanCard } from "../../components/plans/MyPlanCard";
import { BG, CORAL, DARK, LAVENDER, LIGHT, MID, SKY, WHITE } from "../../constants/colors";
import { useCurrentUser } from "../../data/currentUser";
import { usePlanFeed } from "../../data/planFeed";
import { isToday } from "../../data/plans";
import type { Plan } from "../../types";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

/**
 * "Wednesday, August 27, 2026". No locale is passed, so this reads in whatever
 * the browser is set to rather than forcing US order on everyone.
 */
const today = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

export function HomeTab({ onPlanTap, onEdit, onCancel, onSuggest, onBell, unread }: {
  onPlanTap: (p: Plan) => void;
  /** Your own plans only — the app shell guards it too. */
  onEdit: (p: Plan) => void;
  /** A plan you joined, whose host left something open to suggestions. */
  onSuggest: (p: Plan) => void;
  /** Raised to the app shell, which owns the confirmation dialog. */
  onCancel: (p: Plan) => void;
  onBell: () => void;
  unread: number;
}) {
  const { firstName, initials } = useCurrentUser();
  // Plans you host and plans you've joined, from the feed the whole app shares.
  const { myPlans: plans, loading, error, joinError } = usePlanFeed();

  const todayPlans = plans.filter((p) => isToday(p.startsAt));
  const laterPlans = plans.filter((p) => !isToday(p.startsAt));

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs font-bold" style={{ color: MID }}>{greeting()} 👋</p>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: DARK }}>Hey, {firstName}!</h1>
          {/* Only once there's a list to date. With none, the empty state below
              is already showing today's date, and twice would be once too many. */}
          {plans.length > 0 && (
            <p className="text-xs font-bold mt-1" style={{ color: SKY }}>{today()}</p>
          )}
        </div>
        {/* Avatar circle with overlapping bell */}
        <button onClick={onBell} className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold text-white select-none"
            style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})` }}>
            {initials}
          </div>
          {/* Small bell circle overlapping top-right corner */}
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2"
            style={{ background: WHITE, borderColor: BG, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
            <Bell size={11} style={{ color: CORAL }} />
          </div>
          {/* Unread dot on the bell */}
          {unread > 0 && (
            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: CORAL, borderColor: BG }} />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
        {/* Coincidence alerts are held back from v1 — see
            HomeTab.withCoincidenceAlerts.tsx for the version that has them. */}

        {error && (
          <p className="text-sm font-bold text-center py-8" style={{ color: CORAL }}>{error}</p>
        )}

        {/* Leaving a plan writes to the server, so it can fail. */}
        {joinError && (
          <p className="text-xs font-bold text-center mb-3" style={{ color: CORAL }}>{joinError}</p>
        )}

        {!error && loading && (
          <p className="text-sm font-bold text-center py-12" style={{ color: LIGHT }}>Loading your sidequests…</p>
        )}

        {!error && !loading && (
          <>
            {/* Today's plans */}
            {todayPlans.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-extrabold" style={{ color: DARK }}>Today's Sidequests</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: SKY + "20", color: SKY }}>
                    {todayPlans.length} {todayPlans.length === 1 ? "sidequest" : "sidequests"}
                  </span>
                </div>
                {todayPlans.map((p) => (
                  <MyPlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} onEdit={() => onEdit(p)} onCancel={() => onCancel(p)}
                    // Home carries plans you host as well as ones you joined,
                    // so both halves of the test matter here.
                    onSuggest={p.host !== "You" && (p.flexTime || p.flexLoc) ? () => onSuggest(p) : undefined} />
                ))}
              </>
            )}

            {todayPlans.length > 0 && laterPlans.length > 0 && (
              <div className="h-px my-4" style={{ background: "rgba(0,0,0,0.07)" }} />
            )}

            {/* Later plans */}
            {laterPlans.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-extrabold" style={{ color: DARK }}>Later</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: LAVENDER + "20", color: LAVENDER }}>
                    {laterPlans.length} {laterPlans.length === 1 ? "sidequest" : "sidequests"}
                  </span>
                </div>
                {laterPlans.map((p) => (
                  <MyPlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} onEdit={() => onEdit(p)} onCancel={() => onCancel(p)}
                    // Home carries plans you host as well as ones you joined,
                    // so both halves of the test matter here.
                    onSuggest={p.host !== "You" && (p.flexTime || p.flexLoc) ? () => onSuggest(p) : undefined} />
                ))}
              </>
            )}

            {/* Empty nudge. `min-h-full` claims the whole scroll area — with
                nothing else on the tab there's nothing to scroll — so the block
                can centre itself in it rather than sitting under the greeting. */}
            {plans.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-full gap-3 text-center">
                <p className="text-2xl font-extrabold" style={{ color: SKY }}>{today()}</p>
                <p className="text-base font-extrabold mt-3" style={{ color: DARK }}>No sidequests yet</p>
                <p className="text-sm" style={{ color: MID }}>Tap + to create one, or join a friend's from Explore.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}