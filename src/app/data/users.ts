import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/** Auth's own floor. Surfaced here so the form can check before a round trip. */
export const MIN_PASSWORD_LENGTH = 6;

// ── Step 1: create the account ─────────────────────────────────────────────

/** Email + password signup. The profile is filled in on the next screen. */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

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
