import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { BG, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../constants/colors";
import {
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  signInWithApple,
  signInWithGoogle,
  signUpWithEmail,
} from "../data/users";

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" width="17" height="17" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const AppleMark = () => (
  <svg viewBox="0 0 384 512" width="15" height="15" fill="currentColor" aria-hidden>
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

export function SignupScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused,    setEmailFocused]    = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<"" | "email" | "google" | "apple">("");
  const [error, setError] = useState("");

  const busy = pending !== "";
  const canContinue = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= MIN_PASSWORD_LENGTH;

  // Every path lands on the same place: signed in, profile still empty.
  const run = async (kind: "email" | "google" | "apple", signIn: () => Promise<unknown>) => {
    if (busy) return;
    setPending(kind);
    setError("");
    try {
      await signIn();
      onNext();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending("");
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${MINT}60 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />

      {/* Header */}
      <div className="px-6 pt-14 pb-8 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: WHITE, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <ArrowLeft size={17} style={{ color: DARK }} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Sign up</h1>
          <p className="text-xs font-bold" style={{ color: MID }}>Create your sidequest login</p>
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
              autoComplete="new-password"
              className="flex-1 text-base font-extrabold bg-transparent outline-none"
              style={{ color: DARK }}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) run("email", () => signUpWithEmail(email, password));
              }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="flex items-center justify-center">
              {showPassword
                ? <EyeOff size={18} style={{ color: passwordFocused ? LAVENDER : LIGHT }} />
                : <Eye    size={18} style={{ color: passwordFocused ? LAVENDER : LIGHT }} />}
            </button>
          </div>
          <p className="text-xs mt-1 px-1" style={{ color: LIGHT }}>
            At least {MIN_PASSWORD_LENGTH} characters
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
          <span className="text-xs font-bold" style={{ color: LIGHT }}>or sign up with</span>
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
          onClick={() => run("email", () => signUpWithEmail(email, password))}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all"
          style={{
            background: canContinue && !busy ? `linear-gradient(135deg, ${SKY}, ${LAVENDER})` : LIGHT,
            boxShadow: canContinue && !busy ? `0 8px 20px ${SKY}35` : "none",
          }}>
          {pending === "email" ? "Creating account…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
