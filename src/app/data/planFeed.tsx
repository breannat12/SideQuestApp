import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { Plan } from "../types";
import { useCurrentUser } from "./currentUser";
import { type Coords, distanceMiles, formatDistance, getMyCoords } from "./places";
import { joinPlan, leavePlan, watchFriendPlans, watchMyPlans } from "./plans";

interface PlanFeedValue {
  /** Plans you host or have joined — what Home lists. */
  myPlans: Plan[];
  /** Plans friends addressed to you — what Explore offers to join. */
  friendPlans: Plan[];
  /**
   * Friends' plans that were called off. Kept apart from `friendPlans` so they
   * leave Explore immediately while still being able to tell you they're off.
   */
  cancelledPlans: Plan[];
  /** True until both subscriptions have reported once. */
  loading: boolean;
  error: string;
  /** True if you're on the plan's roster, by uid rather than by name. */
  isJoined: (plan: Plan) => boolean;
  /**
   * The current version of a plan someone is holding a copy of. Sheets keep the
   * plan they were opened with, and that snapshot goes stale the moment its
   * roster changes — including from the viewer's own tap on Join.
   */
  latest: (plan: Plan) => Plan;
  /** Plan id currently being written, so its button can show a pending state. */
  pendingId: string;
  /** Joins if you're out, leaves if you're in. Resolves once the write lands. */
  toggleJoin: (plan: Plan) => Promise<void>;
  /** Set when the last join or leave failed; cleared when the next one starts. */
  joinError: string;
  /** Your position, or null once we know it can't be had. */
  myCoords: Coords | null;
  /** True until that resolves, so the UI can wait rather than assume failure. */
  locating: boolean;
}

const EMPTY: PlanFeedValue = {
  myPlans: [], friendPlans: [], cancelledPlans: [], loading: true, error: "",
  isJoined: () => false, latest: (plan) => plan,
  pendingId: "", toggleJoin: async () => {}, joinError: "",
  myCoords: null, locating: true,
};

/**
 * Stamps how far each plan is from you. Done here rather than in the query
 * layer because it takes two things a snapshot doesn't have — the viewer's
 * position, and the fact that it can change without the plans changing.
 *
 * A plan whose location was typed rather than picked has no coordinates, so it
 * keeps no distance and sorts last under "Nearest".
 */
function withDistance(plans: Plan[], from: Coords | null): Plan[] {
  if (!from) return plans;
  return plans.map((plan) => {
    if (typeof plan.lat !== "number" || typeof plan.lng !== "number") return plan;
    const miles = distanceMiles(from, { lat: plan.lat, lng: plan.lng });
    return { ...plan, distanceMiles: miles, distance: formatDistance(miles) };
  });
}

const PlanFeedContext = createContext<PlanFeedValue>(EMPTY);

/**
 * One subscription to each plan query, shared by every tab that reads them.
 * Home, Explore and the notification drawer all want the same two lists, and
 * subscribing per-tab would mean a fresh read every time someone switches tabs.
 */
export function PlanFeedProvider({ children }: { children: ReactNode }) {
  const { status, uid, name } = useCurrentUser();
  const [myPlans, setMyPlans]         = useState<Plan[]>([]);
  const [friendPlans, setFriendPlans] = useState<Plan[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [pendingId, setPendingId]     = useState("");
  const [joinError, setJoinError]     = useState("");
  const [myCoords, setMyCoords]       = useState<Coords | null>(null);
  const [locating, setLocating]       = useState(true);

  // Resolved once per session. Geolocation is shared with place search, so this
  // reuses whatever that already worked out rather than prompting again.
  useEffect(() => {
    let live = true;
    void getMyCoords()
      .then((coords) => { if (live) setMyCoords(coords); })
      .catch(() => { if (live) setMyCoords(null); })
      .finally(() => { if (live) setLocating(false); });
    return () => { live = false; };
  }, []);

  // Re-subscribes when the session changes, so signing in as someone else swaps
  // both lists rather than leaving the last person's plans on screen.
  useEffect(() => {
    if (status !== "signedIn") {
      setMyPlans([]);
      setFriendPlans([]);
      setLoading(status === "loading");
      return;
    }

    setLoading(true);
    let mineReady = false;
    let theirsReady = false;
    const settle = () => { if (mineReady && theirsReady) setLoading(false); };

    const unsubMine = watchMyPlans(
      (found) => { setMyPlans(found); setError(""); mineReady = true; settle(); },
      ()      => { setError("Couldn't load your plans."); mineReady = true; settle(); },
    );
    // A failure here is quieter than one on Home: an empty friends' feed reads
    // as "nothing on" rather than as something broken, and the error banner
    // Home already shows covers the case where Firestore is unreachable at all.
    const unsubTheirs = watchFriendPlans(
      (found) => { setFriendPlans(found); theirsReady = true; settle(); },
      ()      => { setFriendPlans([]); theirsReady = true; settle(); },
    );

    return () => { unsubMine(); unsubTheirs(); };
  }, [status, uid]);

  const isJoined = useCallback(
    (plan: Plan) => Boolean(uid) && (plan.roster ?? []).some((a) => a.uid === uid),
    [uid],
  );

  // A cancelled plan comes off both tabs the moment its host calls it off —
  // for the host, for everyone who'd joined, and for everyone still deciding.
  const live = (plans: Plan[]) => plans.filter((p) => !p.cancelled);

  // Decorated once, and the only versions anything downstream sees — so a plan
  // handed to a sheet by `latest` carries the same distance as its card did.
  const minePlus   = useMemo(() => withDistance(live(myPlans), myCoords), [myPlans, myCoords]);
  const theirsPlus = useMemo(() => withDistance(live(friendPlans), myCoords), [friendPlans, myCoords]);

  // Only other people's: you don't need telling about a plan you called off.
  const cancelledPlans = useMemo(() => friendPlans.filter((p) => p.cancelled), [friendPlans]);

  // Cancelled plans are searched too. A sheet opened just before its host
  // called the plan off would otherwise keep showing the copy it was handed,
  // with a live Join button on a plan that no longer exists.
  const latest = useCallback(
    (plan: Plan) =>
      minePlus.find((p) => p.id === plan.id) ??
      theirsPlus.find((p) => p.id === plan.id) ??
      cancelledPlans.find((p) => p.id === plan.id) ??
      plan,
    [minePlus, theirsPlus, cancelledPlans],
  );

  const toggleJoin = useCallback(async (plan: Plan) => {
    // The host leaving their own plan would strand everyone else on it, and a
    // plan that's been called off isn't joinable at all.
    if (!plan.hostUid || plan.hostUid === uid || plan.cancelled || pendingId) return;

    setPendingId(plan.id);
    setJoinError("");
    try {
      if (isJoined(plan)) await leavePlan(plan.id);
      else                await joinPlan(plan.id, name);
      // No local state to update: both lists are live, so the snapshot that
      // follows this write is what moves the plan onto Home.
    } catch {
      setJoinError("Couldn't update your RSVP. Try again.");
    } finally {
      setPendingId("");
    }
  }, [uid, name, pendingId, isJoined]);

  const value = useMemo<PlanFeedValue>(
    () => ({
      myPlans: minePlus,
      friendPlans: theirsPlus,
      cancelledPlans,
      loading, error, isJoined, latest, pendingId, toggleJoin, joinError,
      myCoords, locating,
    }),
    [minePlus, theirsPlus, cancelledPlans, loading, error, isJoined, latest, pendingId, toggleJoin, joinError, myCoords, locating],
  );

  return <PlanFeedContext.Provider value={value}>{children}</PlanFeedContext.Provider>;
}

export const usePlanFeed = () => useContext(PlanFeedContext);
