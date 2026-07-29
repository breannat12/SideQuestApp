import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth, db } from "./firebase";

/**
 * Sentinel used in mock data wherever an avatar is meant to be *you*.
 * `AvatarBubble` swaps it for the signed-in user's initials, so seeded plans
 * show the right person without every call site knowing who that is.
 */
export const ME = "@me";

interface CurrentUserValue {
  /** Full name as typed on Create Profile. Empty until the profile is saved. */
  name: string;
  /** Handle without the leading `@`, lowercase. */
  handle: string;
  /** First name, or "there" — safe to drop straight into a greeting. */
  firstName: string;
  /** Up to two letters for avatars, or "?" before a name exists. */
  initials: string;
  setProfile: (name: string, handle: string) => void;
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
  name: "",
  handle: "",
  firstName: "there",
  initials: "?",
  setProfile: () => {},
});

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState({ name: "", handle: "" });

  // Covers the log-in path (and a page refresh mid-session), where nothing in
  // this session went through Create Profile. A profile already set locally
  // always wins — it's the newer of the two.
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      let stored = { name: user.displayName ?? "", handle: "" };
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          stored = { name: data.name ?? stored.name, handle: data.username ?? "" };
        }
      } catch {
        // Offline or rules-blocked: displayName alone is still better than nothing.
      }
      if (!stored.name && !stored.handle) return;
      setProfileState((prev) => (prev.name || prev.handle ? prev : stored));
    });
  }, []);

  const value = useMemo<CurrentUserValue>(() => ({
    name:      profile.name,
    handle:    profile.handle,
    firstName: profile.name.trim().split(/\s+/)[0] || "there",
    initials:  deriveInitials(profile.name),
    setProfile: (name, handle) =>
      setProfileState({ name: name.trim(), handle: handle.trim().toLowerCase() }),
  }), [profile]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export const useCurrentUser = () => useContext(CurrentUserContext);
