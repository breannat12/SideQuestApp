import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { AppleMark, GoogleMark } from "../components/common/BrandMarks";
import { BG, CORAL, DARK, LAVENDER, LIGHT, MID, SKY, WHITE } from "../constants/colors";
import { useCurrentUser } from "../data/currentUser";
import {
  authErrorMessage,
  fetchProfile,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from "../data/users";
import type { User } from "firebase/auth";

export function LoginScreen({
  onLoggedIn,
  onNeedsProfile,
  onSignUp,
  onBack,
}: {
  onLoggedIn: () => void;
  /** Signed in, but signup never got as far as claiming a name and handle. */
  onNeedsProfile: () => void;
  onSignUp: () => void;
  onBack: () => void;
}) {
  const { setProfile } = useCurrentUser();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused,    setEmailFocused]    = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<"" | "email" | "google" | "apple">("");
  const [error, setError] = useState("");

  const busy = pending !== "";
  // No length floor here: a too-short password is a wrong password, and Auth's
  // own message for that is more useful than greying the button out.
  const canContinue = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length > 0;

  /**
   * Where you land depends on whether setup ever finished — a Google account
   * that bailed before Create Profile can arrive here just as easily as it can
   * arrive at signup.
   */
  const run = async (kind: "email" | "google" | "apple", signIn: () => Promise<User>) => {
    if (busy) return;
    setPending(kind);
    setError("");
    try {
      const user = await signIn();
      // A failed lookup shouldn't strand a valid session on this screen; the
      // display name is enough to get someone in, and profile setup can retry.
      const profile = await fetchProfile(user.uid).catch(() => null);
      const name    = profile?.name || user.displayName || "";

      if (!name) return onNeedsProfile();
      setProfile(name, profile?.handle ?? "");
      onLoggedIn();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending("");
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${SKY}60 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />

      {/* Header */}
      <div className="px-6 pt-14 pb-8 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: WHITE, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <ArrowLeft size={17} style={{ color: DARK }} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Welcome back</h1>
          <p className="text-xs font-bold" style={{ color: MID }}>Log in to your sidequest</p>
        </div>
      </div>

      <div className="px-6 flex flex-col gap-4">
        {/* Email */}
        <div>
          <label className="text-xs font-extrabold mb-1.5 block" style={{ color: MID }}>EMAIL</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
            style={{
              background: WHITE,
              border: `2px solid ${emailFocused ? SKY : "rgba(0,0,0,0.06)"}`,
              boxShadow: emailFocused ? `0 0 0 3px ${SKY}18` : "none",
            }}>
            <Mail size={17} style={{ color: emailFocused ? SKY : LIGHT }} />
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              className="flex-1 text-base font-extrabold bg-transparent outline-none"
              style={{ color: DARK }}
              placeholder="jane@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-extrabold mb-1.5 block" style={{ color: MID }}>PASSWORD</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
            style={{
              background: WHITE,
              border: `2px solid ${passwordFocused ? LAVENDER : "rgba(0,0,0,0.06)"}`,
              boxShadow: passwordFocused ? `0 0 0 3px ${LAVENDER}18` : "none",
            }}>
            <Lock size={17} style={{ color: passwordFocused ? LAVENDER : LIGHT }} />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="flex-1 text-base font-extrabold bg-transparent outline-none"
              style={{ color: DARK }}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) run("email", () => signInWithEmail(email, password));
              }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="flex items-center justify-center">
              {showPassword
                ? <EyeOff size={18} style={{ color: passwordFocused ? LAVENDER : LIGHT }} />
                : <Eye    size={18} style={{ color: passwordFocused ? LAVENDER : LIGHT }} />}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
          <span className="text-xs font-bold" style={{ color: LIGHT }}>or log in with</span>
          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
        </div>

        {/* Social */}
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => run("google", signInWithGoogle)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold transition-all"
            style={{ background: WHITE, border: "1.5px solid rgba(0,0,0,0.1)", color: DARK, opacity: busy ? 0.6 : 1 }}>
            <GoogleMark /> {pending === "google" ? "Opening…" : "Google"}
          </button>
          <button
            disabled={busy}
            onClick={() => run("apple", signInWithApple)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold transition-all"
            style={{ background: DARK, border: `1.5px solid ${DARK}`, color: WHITE, opacity: busy ? 0.6 : 1 }}>
            <AppleMark /> {pending === "apple" ? "Opening…" : "Apple"}
          </button>
        </div>
      </div>

      <div className="px-6 pb-8 mt-auto pt-4">
        {error && (
          <p className="text-xs font-bold text-center mb-3 px-1" style={{ color: CORAL }}>
            {error}
          </p>
        )}
        <button
          disabled={!canContinue || busy}
          onClick={() => run("email", () => signInWithEmail(email, password))}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all"
          style={{
            background: canContinue && !busy ? `linear-gradient(135deg, ${SKY}, ${LAVENDER})` : LIGHT,
            boxShadow: canContinue && !busy ? `0 8px 20px ${SKY}35` : "none",
          }}>
          {pending === "email" ? "Logging in…" : "Log in →"}
        </button>

        <p className="text-center text-xs font-bold mt-4" style={{ color: MID }}>
          New here?{" "}
          <button onClick={onSignUp} className="font-extrabold" style={{ color: SKY }}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
