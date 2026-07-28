import { Clock, List, Map, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { PlanCard } from "../../components/plans/PlanCard";
import { BG, CARD, DARK, LIGHT, MID, SKY, WHITE } from "../../constants/colors";
import { ACTIVITIES } from "../../data/activities";
import { INITIAL_GROUPS } from "../../data/groups";
import { PLANS } from "../../data/plans";
import type { Plan } from "../../types";

// Fake distance values so we can sort
const PLAN_DISTANCES: Record<number, number> = { 1: 0.3, 2: 0.6, 3: 1.1, 4: 0.8, 5: 1.4, 6: 1.0 };
// Minutes-from-now values for "soon" sort
const PLAN_MINUTES: Record<number, number>   = { 1: 0, 2: 45, 3: 135, 4: 300, 5: 480, 6: 420 };

export function ExploreTab({ onPlanTap, onSuggest }: {
  onPlanTap: (p: Plan) => void;
  onSuggest: (p: Plan) => void;
}) {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [viewMode, setViewMode]                  = useState<"list" | "map">("list");
  const [selectedGroup, setSelectedGroup]        = useState<string | null>(null);
  const [sortBy, setSortBy]                      = useState<"distance" | "time">("distance");

  const filtered = PLANS
    .filter((p) => {
      const actMatch = !selectedActivity || p.emoji === ACTIVITIES.find((a) => a.label === selectedActivity)?.emoji;
      const grpMatch = !selectedGroup || p.group === selectedGroup;
      return actMatch && grpMatch;
    })
    .slice()
    .sort((a, b) =>
      sortBy === "distance"
        ? (PLAN_DISTANCES[a.id] ?? 99) - (PLAN_DISTANCES[b.id] ?? 99)
        : (PLAN_MINUTES[a.id]  ?? 9999) - (PLAN_MINUTES[b.id]  ?? 9999)
    );

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="px-5 pt-5 pb-0 flex-shrink-0">
        <h1 className="text-2xl font-extrabold mb-3" style={{ color: DARK }}>Explore</h1>
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-3"
          style={{ background: CARD, border: "1.5px solid rgba(0,0,0,0.06)" }}>
          <Search size={16} style={{ color: MID }} />
          <span className="text-sm" style={{ color: LIGHT }}>Search plans, people, places…</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 mb-2.5" style={{ scrollbarWidth: "none" }}>
          {ACTIVITIES.map((a) => {
            const active = selectedActivity === a.label;
            return (
              <button key={a.label} onClick={() => setSelectedActivity(active ? null : a.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold flex-shrink-0 transition-all"
                style={{ background: active ? a.color : a.color + "20", color: active ? WHITE : DARK }}>
                {a.emoji} {a.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {["All", ...INITIAL_GROUPS.map((g) => g.name)].map((g) => {
            const active = (g === "All" && !selectedGroup) || selectedGroup === g;
            return (
              <button key={g} onClick={() => setSelectedGroup(g === "All" ? null : g)}
                className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 transition-all"
                style={{ background: active ? DARK : CARD, color: active ? WHITE : MID }}>
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count + sort + view controls */}
      <div className="px-5 flex items-center justify-between mb-3 flex-shrink-0">
        <span className="text-xs font-bold" style={{ color: MID }}>{filtered.length} plans</span>
        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: CARD }}>
            <button onClick={() => setSortBy("distance")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all"
              style={{ background: sortBy === "distance" ? WHITE : "transparent", color: sortBy === "distance" ? DARK : MID }}>
              <MapPin size={11} /> Nearest
            </button>
            <button onClick={() => setSortBy("time")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all"
              style={{ background: sortBy === "time" ? WHITE : "transparent", color: sortBy === "time" ? DARK : MID }}>
              <Clock size={11} /> Soonest
            </button>
          </div>
          {/* View toggle */}
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: CARD }}>
            {[{ mode: "list" as const, Icon: List }, { mode: "map" as const, Icon: Map }].map(({ mode, Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)} className="p-1.5 rounded-lg transition-all"
                style={{ background: viewMode === mode ? WHITE : "transparent" }}>
                <Icon size={14} style={{ color: viewMode === mode ? DARK : MID }} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {viewMode === "map" ? (
        <div className="flex-1 mx-5 mb-2 rounded-3xl overflow-hidden relative" style={{ background: "#DFF0F8", minHeight: 0 }}>
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "repeating-linear-gradient(0deg,#6EC6FF 0,#6EC6FF 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#6EC6FF 0,#6EC6FF 1px,transparent 1px,transparent 48px)",
          }} />
          <div className="absolute inset-0">
            <div className="absolute w-full h-0.5 opacity-40 top-1/2" style={{ background: WHITE }} />
            <div className="absolute h-full w-0.5 opacity-40 left-1/3" style={{ background: WHITE }} />
            <div className="absolute h-full w-0.5 opacity-40 left-2/3" style={{ background: WHITE }} />
          </div>
          {[
            { top: "28%", left: "22%", plan: PLANS[0] },
            { top: "48%", left: "58%", plan: PLANS[1] },
            { top: "60%", left: "30%", plan: PLANS[3] },
            { top: "20%", left: "68%", plan: PLANS[4] },
            { top: "70%", left: "70%", plan: PLANS[5] },
          ].map(({ top, left, plan }) => (
            <button key={plan.id} onClick={() => onPlanTap(plan)}
              className="absolute" style={{ top, left, transform: "translate(-50%,-50%)" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white"
                style={{ background: plan.accentColor + "60" }}>{plan.emoji}</div>
            </button>
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-5 h-5 rounded-full border-white shadow-lg"
              style={{ background: SKY, outline: `3px solid ${SKY}40` }} />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 90, height: 90, border: `1.5px dashed ${SKY}60`, marginLeft: -45, marginTop: -45 }} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-bold" style={{ color: MID }}>No plans match these filters</p>
              <button onClick={() => { setSelectedActivity(null); setSelectedGroup(null); }}
                className="text-xs font-extrabold" style={{ color: SKY }}>Clear filters</button>
            </div>
          ) : filtered.map((p) => (
            <PlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} onSuggest={() => onSuggest(p)} compact />
          ))}
        </div>
      )}
    </div>
  );
}