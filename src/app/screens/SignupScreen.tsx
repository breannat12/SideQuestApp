import { ArrowLeft, Check, UserRound, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BG, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../constants/colors";

export function SignupScreen({ onNext, onBack }: { onNext: (name: string, handle: string) => void; onBack: () => void }) {
  const [name,   setName]   = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [nameFocused,   setNameFocused]   = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canContinue = name.trim().length >= 2 && handle.trim().length >= 2;

  // Auto-derive handle from name if untouched
  const onNameChange = (v: string) => {
    setName(v);
  };

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${MINT}60 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />

      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: WHITE, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <ArrowLeft size={17} style={{ color: DARK }} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Create account</h1>
          <p className="text-xs font-bold" style={{ color: MID }}>Just two things to get started</p>
        </div>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-[1.75rem] flex items-center justify-center text-3xl font-black text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})` }}>
            {name.trim() ? name.trim().split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
          </div>
          {handle && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap"
              style={{ background: WHITE, color: SKY, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              @{handle.toLowerCase().replace(/\s/g, "")}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 flex flex-col gap-4">
        {/* Full name */}
        <div>
          <label className="text-xs font-extrabold mb-1.5 block" style={{ color: MID }}>FULL NAME</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
            style={{
              background: WHITE,
              border: `2px solid ${nameFocused ? SKY : "rgba(0,0,0,0.06)"}`,
              boxShadow: nameFocused ? `0 0 0 3px ${SKY}18` : "none",
            }}>
            <UserRound size={17} style={{ color: nameFocused ? SKY : LIGHT }} />
            <input
              autoFocus
              className="flex-1 text-base font-extrabold bg-transparent outline-none"
              style={{ color: DARK }}
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="text-xs font-extrabold mb-1.5 block" style={{ color: MID }}>USERNAME</label>
          <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl transition-all"
            style={{
              background: WHITE,
              border: `2px solid ${handleFocused ? MINT : "rgba(0,0,0,0.06)"}`,
              boxShadow: handleFocused ? `0 0 0 3px ${MINT}18` : "none",
            }}>
            <span className="text-base font-extrabold" style={{ color: handleFocused ? MINT : LIGHT }}>@</span>
            <input
              className="flex-1 text-base font-extrabold bg-transparent outline-none"
              style={{ color: DARK }}
              placeholder="jane.dodo12"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 20))}
              onFocus={() => setHandleFocused(true)}
              onBlur={() => setHandleFocused(false)}
            />
            {handle.length >= 2 && (
              <Check size={16} style={{ color: LAVENDER }} />
            )}
          </div>
          <p className="text-xs mt-1 px-1" style={{ color: LIGHT }}>
            Letters, numbers, underscores & dots only
          </p>
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-extrabold mb-1.5 block" style={{ color: MID }}>PASSWORD</label>
          <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl transition-all"
            style={{
              background: WHITE,
              border: `2px solid ${passwordFocused ? SKY : "rgba(0,0,0,0.06)"}`,
              boxShadow: passwordFocused ? `0 0 0 3px ${SKY}18` : "none",
            }}>
            <input
              type={showPassword ? "text" : "password"}
              className="flex-1 text-base font-extrabold bg-transparent outline-none"
              style={{ color: DARK }}
              placeholder="•••••"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 20))}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex items-center justify-center"
            >
              {showPassword ? (
                <EyeOff size={18} style={{ color: passwordFocused ? SKY : LIGHT }} />
              ) : (
                <Eye size={18} style={{ color: passwordFocused ? SKY : LIGHT }} />
              )}
            </button>
          </div>
        </div>

        {/* Divider hint */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
          <span className="text-xs font-bold" style={{ color: LIGHT }}>or sign up with</span>
          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
        </div>

        {/* Social buttons */}
        <div className="flex gap-3">
          {[{ label: "Google", emoji: "G", bg: "#fff", border: "rgba(0,0,0,0.1)" }, { label: "Apple", emoji: "🍎", bg: DARK, border: DARK }].map((s) => (
            <button key={s.label} onClick={() => onNext(name || "User", handle || "user")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-extrabold"
              style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.bg === DARK ? WHITE : DARK }}>
              <span>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-8 mt-auto pt-4">
        <button
          disabled={!canContinue}
          onClick={() => canContinue && onNext(name.trim(), handle.trim())}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all"
          style={{
            background: canContinue ? `linear-gradient(135deg, ${SKY}, ${LAVENDER})` : LIGHT,
            boxShadow: canContinue ? `0 8px 20px ${SKY}35` : "none",
          }}>
          Continue →
        </button>
      </div>
    </div>
  );
}