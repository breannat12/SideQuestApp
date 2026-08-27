import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { DirectoryUser, FriendStatus, StoredProfile } from "../types";

/** Auth's own floor. Surfaced here so the form can check before a round trip. */
export const MIN_PASSWORD_LENGTH = 6;

// ── Alert radius ───────────────────────────────────────────────────────────
// Shared by the slider and by the clamp on whatever comes back from Firestore,
// so a hand-edited document can't render a thumb off the end of the track.

export const RADIUS_MIN     = 0.5;
export const RADIUS_MAX     = 5;
export const RADIUS_STEP    = 0.5;
export const RADIUS_DEFAULT = 1.5;

const readRadius = (value: unknown): number => {
  const miles = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(miles)) return RADIUS_DEFAULT;
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, miles));
};

/**
 * Merges the radius onto the profile row, leaving name and handle alone.
 * A signed-out caller is a no-op rather than an error: onboarding can reach
 * this step, and losing a slider position is not worth interrupting anyone for.
 */
export async function saveRadius(miles: number): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "users", user.uid), { radiusMiles: miles }, { merge: true });
}

// ── Availability ───────────────────────────────────────────────────────────

export const STATUS_DEFAULT: FriendStatus = "available";

const STATUSES: FriendStatus[] = ["available", "busy", "dnd"];

/** Anything unrecognised — an older row, a hand-edited one — reads as available. */
export const readStatus = (value: unknown): FriendStatus =>
  STATUSES.includes(value as FriendStatus) ? (value as FriendStatus) : STATUS_DEFAULT;

/** Merged onto the profile row, same as the radius above. */
export async function saveStatus(status: FriendStatus): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "users", user.uid), { status }, { merge: true });
}

// ── Step 1: create the account ─────────────────────────────────────────────

/** Email + password signup. The profile is filled in on the next screen. */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

/**
 * Google and Apple don't distinguish signing up from signing back in — the
 * popup returns an existing account if there is one — so both entry points
 * share these two.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signInWithApple(): Promise<User> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

// ── Coming back ────────────────────────────────────────────────────────────

/** Email + password sign-in for an account that already exists. */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * The saved profile for a uid, or null if signup never got past the account.
 * Both the boot-time session restore and a fresh log-in ask this to decide
 * whether the person lands in the app or back on profile setup.
 */
export async function fetchProfile(uid: string): Promise<StoredProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const data   = snap.data();
  const name   = String(data.name ?? "");
  const handle = String(data.username ?? "");
  if (!name && !handle) return null;

  return {
    name,
    handle,
    radius: readRadius(data.radiusMiles),
    status: readStatus(data.status),
  };
}

// ── Step 2: claim a name and handle ────────────────────────────────────────

/**
 * Writes the profile to `users/{uid}` and reserves the handle in
 * `usernames/{handle}`. Both happen in one transaction so two people racing
 * for the same handle can't both win it.
 */
export async function saveProfile(name: string, handle: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  const cleanName   = name.trim();
  const cleanHandle = handle.trim().toLowerCase();

  await runTransaction(db, async (tx) => {
    const handleRef = doc(db, "usernames", cleanHandle);
    const existing  = await tx.get(handleRef);

    // Re-running this screen for the same account shouldn't look like a clash.
    if (existing.exists() && existing.data().uid !== user.uid) {
      throw new Error("handle-taken");
    }

    tx.set(handleRef, { uid: user.uid });
    tx.set(doc(db, "users", user.uid), {
      uid:       user.uid,
      username:  cleanHandle,
      name:      cleanName,
      email:     user.email ?? null,
      createdAt: serverTimestamp(),
    });
  });

  await updateProfile(user, { displayName: cleanName });
}

// ── Step 3: find people to follow ──────────────────────────────────────────

/** How many directory rows a single search / suggestion pass pulls down. */
const DIRECTORY_PAGE = 25;

const toDirectoryUser = (data: Record<string, unknown>): DirectoryUser => ({
  uid:      String(data.uid ?? ""),
  username: String(data.username ?? ""),
  name:     String(data.name ?? ""),
});

/**
 * Users to show before anyone types. Ordered by handle so the list is stable
 * between renders rather than reshuffling on every visit.
 */
export async function listUsers(): Promise<DirectoryUser[]> {
  const snap = await getDocs(
    query(collection(db, "users"), orderBy("username"), limit(DIRECTORY_PAGE)),
  );
  return excludeSelf(snap.docs.map((d) => toDirectoryUser(d.data())));
}

/**
 * Prefix search over handles. Firestore has no substring index, so this is a
 * range scan from the term to the term plus a high code point — which matches
 * exactly the handles that *start with* what was typed.
 */
export async function searchUsersByUsername(term: string): Promise<DirectoryUser[]> {
  const clean = term.trim().toLowerCase().replace(/^@/, "");
  if (!clean) return listUsers();

  const snap = await getDocs(
    query(
      collection(db, "users"),
      orderBy("username"),
      startAt(clean),
      endAt(clean + "\uf8ff"),
      limit(DIRECTORY_PAGE),
    ),
  );
  return excludeSelf(snap.docs.map((d) => toDirectoryUser(d.data())));
}

/** You're already yourself — never offer to add yourself, or a broken row. */
function excludeSelf(users: DirectoryUser[]): DirectoryUser[] {
  const me = auth.currentUser?.uid;
  return users.filter((u) => u.uid && u.username && u.uid !== me);
}

// Friending itself lives in `friendRequests.tsx`: adding someone is a request
// they have to accept, and accepting writes both sides of the pair at once.

// ── Errors ─────────────────────────────────────────────────────────────────

/** Turns a Firebase error code into something worth showing a user. */
export function authErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : err instanceof Error
        ? err.message
        : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email already has an account.";
    case "auth/weak-password":
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "auth/invalid-email":
      return "Invalid email.";
    // With email-enumeration protection on, Auth collapses "no such user" and
    // "wrong password" into one code on purpose. Don't narrow it in the copy.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/user-disabled":
      return "That account has been disabled.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and retry.";
    case "auth/account-exists-with-different-credential":
      return "That email is already signed up with a different method.";
    case "auth/operation-not-allowed":
      return "That sign-in method isn't enabled for this app yet.";
    case "handle-taken":
      return "Username is already taken.";
    case "not-signed-in":
      return "You're signed out. Go back and sign up again.";
    case "permission-denied":
      return "Couldn't save your profile. Check Firestore rules.";
    default:
      return "Something went wrong. Please try again.";
  }
}
