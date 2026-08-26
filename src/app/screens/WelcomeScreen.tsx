import { BG, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, PEACH, SKY, WHITE } from "../constants/colors";

// ── Welcome Screen ─────────────────────────────────────────────────────────
export function WelcomeScreen({ onSignUp, onLogIn }: { onSignUp: () => void; onLogIn: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
      {/* Top decorative blobs */}
      <div className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${SKY}60 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-32 left-0 w-40 h-40 rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${MINT}60 0%, transparent 70%)`, transform: "translate(-30%, 0)" }} />
      <div className="absolute top-1/3 left-0 w-32 h-32 rounded-full opacity-25 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${LAVENDER}60 0%, transparent 70%)`, transform: "translate(-40%, 0)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Logo mark */}
        <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})`, boxShadow: `0 12px 32px ${SKY}50` }}>
          <span className="text-4xl">🤙</span>
        </div>

        <h1 className="text-4xl font-extrabold mb-2" style={{ color: DARK, letterSpacing: "-0.03em" }}>sidequest</h1>
        <p className="text-base font-bold mb-2" style={{ color: MID }}>spontaneous hangouts, made easy.</p>

        {/* Social proof */}
        <div className="flex items-center gap-2 mb-10">
          <div className="flex -space-x-2">
            {[PEACH, CORAL, SKY, MINT, LAVENDER].map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-extrabold text-white"
                style={{ background: c, borderColor: BG }}>
                {["M", "R", "L", "C", "Z"][i]}
              </div>
            ))}
          </div>
          <p className="text-xs font-bold" style={{ color: MID }}>Join 2,400+ people hanging out</p>
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <button onClick={onSignUp}
            className="w-full py-4 rounded-2xl font-extrabold text-white text-base"
            style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})`, boxShadow: `0 8px 20px ${SKY}40` }}>
            Create Account
          </button>
          <button onClick={onLogIn}
            className="w-full py-4 rounded-2xl font-extrabold text-base"
            style={{ background: WHITE, color: DARK, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            Log In
          </button>
        </div>
      </div>

      <p className="text-center text-xs pb-8 px-8" style={{ color: LIGHT }}>
        By continuing you agree to our Terms & Privacy Policy
      </p>
    </div>
  );
}