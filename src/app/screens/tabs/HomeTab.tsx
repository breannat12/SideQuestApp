import { Bell } from "lucide-react";
import { CoincidenceSection } from "../../components/home/CoincidenceSection";
import { MyPlanCard } from "../../components/plans/MyPlanCard";
import { BG, CORAL, DARK, LAVENDER, MID, SKY, WHITE } from "../../constants/colors";
import { MY_PLANS_LATER, MY_PLANS_TODAY } from "../../data/plans";
import type { Plan } from "../../types";

export function HomeTab({ onPlanTap, onSuggest, onBell, unread }: {
  onPlanTap: (p: Plan) => void;
  onSuggest: (p: Plan) => void;
  onBell: () => void;
  unread: number;
}) {
  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs font-bold" style={{ color: MID }}>Good afternoon 👋</p>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: DARK }}>Hey, Alex!</h1>
        </div>
        {/* Avatar circle with overlapping bell */}
        <button onClick={onBell} className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold text-white select-none"
            style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})` }}>
            AX
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
        {/* Coincidence alerts */}
        <CoincidenceSection />

        {/* Today's plans */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold" style={{ color: DARK }}>Today</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: SKY + "20", color: SKY }}>{MY_PLANS_TODAY.length} plans</span>
        </div>
        {MY_PLANS_TODAY.map((p) => (
          <MyPlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} onSuggest={() => onSuggest(p)} />
        ))}

        <div className="h-px my-4" style={{ background: "rgba(0,0,0,0.07)" }} />

        {/* Later plans */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold" style={{ color: DARK }}>Later</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: LAVENDER + "20", color: LAVENDER }}>{MY_PLANS_LATER.length} plans</span>
        </div>
        {MY_PLANS_LATER.map((p) => (
          <MyPlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} onSuggest={() => onSuggest(p)} />
        ))}

        {/* Empty nudge */}
        {MY_PLANS_TODAY.length === 0 && MY_PLANS_LATER.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <span className="text-5xl">📅</span>
            <p className="text-base font-extrabold" style={{ color: DARK }}>No plans yet</p>
            <p className="text-sm" style={{ color: MID }}>Tap + to create one, or explore what's nearby.</p>
          </div>
        )}
      </div>
    </div>
  );
}