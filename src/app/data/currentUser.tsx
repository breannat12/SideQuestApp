import { onAuthStateChanged } from "firebase/auth";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { FriendStatus } from "../types";
import { auth } from "./firebase";
import { RADIUS_DEFAULT, STATUS_DEFAULT, fetchProfile, saveRadius, saveStatus } from "./users";

/**
 * Dragging the radius slider fires a change per half-mile step; only the value
 * someone settles on is worth a write, so the save waits for them to stop.
 */
const RADIUS_SAVE_DELAY_MS = 600;

/**
 * Sentinel used in mock data wherever an avatar is meant to be *you*.
 * `AvatarBubble` swaps it for the signed-in user's initials, so seeded plans
 * show the right person without every call site knowing who that is.
 */
export const ME = "@me";

/**
 * How far Firebase has got in restoring a session. `loading` lasts only until
 * the first `onAuthStateChanged`, and the app holds a splash for it — without
 * that, someone already signed in watches the welcome screen flash past.
 */
export type AuthStatus = "loading" | "signedOut" | "signedIn";

interface CurrentUserValue {
  status: AuthStatus;
  /** Firebase uid, or "" while signed out. Identifies you in shared documents. */
  uid: string;
  /** A saved name is the test for "finished signing up", not just "signed in". */
  hasProfile: boolean;
  /** Full name as typed on Create Profile. Empty until the profile is saved. */
  name: string;
  /** Handle without the leading `@`, lowercase. */
  handle: string;
  /** First name, or "there" — safe to drop straight into a greeting. */
  firstName: string;
  /** Up to two letters for avatars, or "?" before a name exists. */
  initials: string;
  /** Alert radius in miles, as picked during onboarding or on Profile. */
  radius: number;
  /**
   * Availability, as last set on Profile. Persisted, so it outlives a reload.
   * Named apart from `status` above, which is how far auth has got — two
   * different ideas that both want the word.
   */
  availability: FriendStatus;
  /** True while availability is "dnd" — the one setting that silences the bell. */
  dnd: boolean;
  setProfile: (name: string, handle: string) => void;
  /** Applies immediately; the write to Firestore is debounced. */
  setRadius: (miles: number) => void;
  /** Applies immediately; the write follows. Unlike the radius, one tap is one
      deliberate choice, so there's nothing to debounce away. */
  setAvailability: (next: FriendStatus) => void;
}

const deriveInitials = (name: string) => {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "?";
};

const CurrentUserContext = createContext<CurrentUserValue>({
  status: "loading",
  uid: "",
  hasProfile: false,
  name: "",
  handle: "",
  firstName: "there",
  initials: "?",
  radius: RADIUS_DEFAULT,
  availability: STATUS_DEFAULT,
  dnd: false,
  setProfile: () => {},
  setRadius: () => {},
  setAvailability: () => {},
});

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [uid, setUid]              = useState("");
  const [profile, setProfileState] = useState({ name: "", handle: "" });
  const [radius, setRadiusState]   = useState(RADIUS_DEFAULT);
  const [availability, setAvailabilityState] = useState<FriendStatus>(STATUS_DEFAULT);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPendingSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
  };

  const setRadius = useCallback((miles: number) => {
    setRadiusState(miles);
    cancelPendingSave();
    saveTimer.current = setTimeout(() => {
      // Nothing to tell the user here — the slider already moved, and a failed
      // write just means the old value is still what loads next time.
      void saveRadius(miles).catch(() => {});
    }, RADIUS_SAVE_DELAY_MS);
  }, []);

  const setAvailability = useCallback((next: FriendStatus) => {
    setAvailabilityState(next);
    // Optimistic, like the radius: the button has already moved, and a failed
    // write just means the previous status is what loads next time.
    void saveStatus(next).catch(() => {});
  }, []);

  useEffect(() => cancelPendingSave, []);

  // Covers the log-in path (and a page refresh mid-session), where nothing in
  // this session went through Create Profile. A profile already set locally
  // always wins — it's the newer of the two.
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Drop any queued write too, so a radius set moments before signing out
        // can't land on the next account to sign in.
        cancelPendingSave();
        setUid("");
        setProfileState({ name: "", handle: "" });
        setRadiusState(RADIUS_DEFAULT);
        setAvailabilityState(STATUS_DEFAULT);
        setAuthStatus("signedOut");
        return;
      }

      setUid(user.uid);

      let stored = { name: user.displayName ?? "", handle: "" };
      try {
        const saved = await fetchProfile(user.uid);
        if (saved) {
          stored = { name: saved.name || stored.name, handle: saved.handle };
          setRadiusState(saved.radius);
          setAvailabilityState(saved.status);
        }
      } catch {
        // Offline or rules-blocked: displayName alone is still better than nothing.
      }

      setProfileState((prev) => (prev.name || prev.handle ? prev : stored));
      // Set last, and only once the lookup has had its say: boot routing keys
      // off auth status, and reading it early would send a returning user to setup.
      setAuthStatus("signedIn");
    });
  }, []);

  const value = useMemo<CurrentUserValue>(() => ({
    status: authStatus,
    uid,
    hasProfile: Boolean(profile.name),
    name:      profile.name,
    handle:    profile.handle,
    firstName: profile.name.trim().split(/\s+/)[0] || "there",
    initials:  deriveInitials(profile.name),
    radius,
    availability,
    dnd: availability === "dnd",
    setProfile: (name, handle) =>
      setProfileState({ name: name.trim(), handle: handle.trim().toLowerCase() }),
    setRadius,
    setAvailability,
  }), [authStatus, uid, profile, radius, availability, setRadius, setAvailability]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export const useCurrentUser = () => useContext(CurrentUserContext);
