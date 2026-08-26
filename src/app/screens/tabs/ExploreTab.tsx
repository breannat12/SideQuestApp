import { Clock, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { PlanCard } from "../../components/plans/PlanCard";
import { BG, CARD, CORAL, DARK, LIGHT, MID, SKY, WHITE } from "../../constants/colors";
import { ACTIVITIES } from "../../data/activities";
import { useMyFriends } from "../../data/friends";
import { useMyGroups } from "../../data/groups";
import { usePlanFeed } from "../../data/planFeed";
import type { Plan } from "../../types";

export function ExploreTab({ onPlanTap, onSuggest }: {
  onPlanTap: (p: Plan) => void;
  /** Opens the suggestion sheet. Offered per-card, on flexible plans only. */
  onSuggest: (p: Plan) => void;
}) {
  const { groups } = useMyGroups();
  const { friends } = useMyFriends();
  const { friendPlans, loading, isJoined, pendingId, toggleJoin, joinError,
          myCoords, locating } = usePlanFeed();

  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup]       = useState<string | null>(null);
  const [sortBy, setSortBy]                     = useState<"distance" | "time">("time");

  // A group deleted while its chip was active would otherwise keep filtering
  // the list from behind a row that's no longer on screen.
  const groupFilter = groups.some((g) => g.name === selectedGroup) ? selectedGroup : null;

  // Distance needs your position *and* the plan's, so it's only offered once
  // we have yours; a plan whose location was typed rather than picked has no
  // coordinates and sorts to the end rather than pretending to be at zero.
  const canSortByDistance = Boolean(myCoords);
  const sorting = canSortByDistance ? sortBy : "time";

  const filtered = friendPlans
    .filter((p) => {
      const actMatch = !selectedActivity || p.emoji === ACTIVITIES.find((a) => a.label === selectedActivity)?.emoji;
      const grpMatch = !groupFilter || p.group === groupFilter;
      return actMatch && grpMatch;
    })
    .slice()
    .sort((a, b) =>
      sorting === "distance"
        ? (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity)
        : (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0)
    );

  const filtering = Boolean(selectedActivity || groupFilter);

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
        {/* Nothing but "All" until you've made a group, so the row hides itself. */}
        <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none",
          display: groups.length ? undefined : "none" }}>
          {["All", ...groups.map((g) => g.name)].map((g) => {
            const active = (g === "All" && !groupFilter) || groupFilter === g;
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

      {/* Count + sort */}
      <div className="px-5 flex items-center justify-between mb-3 flex-shrink-0">
        <span className="text-xs font-bold" style={{ color: MID }}>
          {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "plan" : "plans"}`}
        </span>
        {/* "Nearest" needs your position, so it stays disabled until we have
            one rather than silently sorting by nothing. */}
        <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: CARD }}>
          <button onClick={() => setSortBy("distance")} disabled={!canSortByDistance}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all"
            style={{
              background: sorting === "distance" ? WHITE : "transparent",
              color:      sorting === "distance" ? DARK : MID,
              opacity:    canSortByDistance ? 1 : 0.45,
            }}>
            <MapPin size={11} /> Nearest
          </button>
          <button onClick={() => setSortBy("time")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all"
            style={{ background: sorting === "time" ? WHITE : "transparent", color: sorting === "time" ? DARK : MID }}>
            <Clock size={11} /> Soonest
          </button>
        </div>
      </div>

      {/* Only worth saying once we've actually tried and failed. */}
      {!locating && !canSortByDistance && (
        <p className="px-5 -mt-1 mb-2 text-xs font-bold flex-shrink-0" style={{ color: LIGHT }}>
          Allow location access to sort by distance.
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
        {joinError && (
          <p className="text-xs font-bold text-center mb-3" style={{ color: CORAL }}>{joinError}</p>
        )}

        {loading ? (
          <p className="text-sm font-bold text-center py-12" style={{ color: LIGHT }}>Loading plans…</p>
        ) : filtered.length > 0 ? (
          filtered.map((p) => (
            <PlanCard key={p.id} plan={p} onTap={() => onPlanTap(p)} compact
              onJoin={() => void toggleJoin(p)} joined={isJoined(p)} pending={pendingId === p.id}
              // Every plan here is someone else's, so the host check is already
              // made — all that's left is whether they said it could move.
              onSuggest={p.flexTime || p.flexLoc ? () => onSuggest(p) : undefined} />
          ))
        ) : filtering ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-bold" style={{ color: MID }}>No plans match these filters</p>
            <button onClick={() => { setSelectedActivity(null); setSelectedGroup(null); }}
              className="text-xs font-extrabold" style={{ color: SKY }}>Clear filters</button>
          </div>
        ) : friends.length === 0 ? (
          /* Nothing here is a friends problem, not a plans problem — say so,
             rather than leaving someone waiting on a feed that can't fill. */
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <span className="text-5xl">👋</span>
            <p className="text-base font-extrabold" style={{ color: DARK }}>No friends yet</p>
            <p className="text-sm" style={{ color: MID }}>
              Add friends from the Friends tab. Their plans turn up here once they share one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <span className="text-5xl">🌱</span>
            <p className="text-base font-extrabold" style={{ color: DARK }}>Nothing on right now</p>
            <p className="text-sm" style={{ color: MID }}>
              When a friend shares a plan with you, it lands here. Tap + to start one yourself.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
