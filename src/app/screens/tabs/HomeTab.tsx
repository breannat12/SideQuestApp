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

export function HomeTab({ onPlanTap, onEdit, onBell, unread }: {
  onPlanTap: (p: Plan) => void;
  /** SUGGEST CHANGES CODE: was `onSuggest`, and fired for joined plans too. */
  onEdit: (p: Plan) => void;
  onBell: () => void;
  unread: number;
}) {
  const { firstName, initials } = useCurrentUser();
  // Plans you host and plans you've joined, from the feed the whole app shares.
  const { myPlans: plans, loading, error } = usePlanFeed();

  const todayPlans = plans.filter((p) => isToday(p.startsAt));
  const laterPlans = plans.filter((p) => !isToday(p.startsAt));

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs font-bold" style={{ color: MID }}>{greeting()} 👋</p>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: DARK }}>Hey, {firstName}!</h1>
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

        {!error && loading && (
          <p className="text-sm font-bold text-center py-12" style={{ color: LIGHT }}>Loading your plans…</p>
        )}

        {!error && !loading && (
          <>
            {/* Today's plans */}
            {todayPlans.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-extrabold" style={{ color: DARK }}>Today's Sidequests</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: SKY + "20", color: SKY }}>{todayPlans.length} plans</span>
                </div>
                {todayPlans.map((p) => (
                  <MyPlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} onEdit={() => onEdit(p)} />
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
                    style={{ background: LAVENDER + "20", color: LAVENDER }}>{laterPlans.length} plans</span>
                </div>
                {laterPlans.map((p) => (
                  <MyPlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} onEdit={() => onEdit(p)} />
                ))}
              </>
            )}

            {/* Empty nudge */}
            {plans.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <span className="text-5xl">📅</span>
                <p className="text-base font-extrabold" style={{ color: DARK }}>No plans yet</p>
                <p className="text-sm" style={{ color: MID }}>Tap + to create one, or join a friend's from Explore.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}