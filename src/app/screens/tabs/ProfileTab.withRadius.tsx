// COINCIDENCE FEATURE -- Reference copy of the Profile tab from when it carried
// the Notification Radius control. The radius only exists to decide how close a
// friend has to be before a coincidence alert fires, so it goes back in when
// that feature does. Swap App.tsx's import to this file to restore it.
//
// Kept in sync by hand: any change to ProfileTab.tsx belongs here too.

import { Check, Clock, EyeOff, Settings } from "lucide-react";
import { useState } from "react";
import { RadiusSlider } from "../../components/common/RadiusSlider";
import { Toggle } from "../../components/common/Toggle";
import { BG, CARD, CORAL, DARK, LAVENDER, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { useCurrentUser } from "../../data/currentUser";
import { signOutUser } from "../../data/users";

export function ProfileTab({ onSignedOut }: { onSignedOut: () => void }) {
  const { name, handle, initials, radius, setRadius } = useCurrentUser();
  const [status, setStatus]         = useState<"available" | "busy" | "dnd">("available");
  const [notifs, setNotifs]         = useState(true);
  const [ghost, setGhost]           = useState(false);
  const [planNotifs, setPlanNotifs] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutUser();
      onSignedOut();          // this tab unmounts, so there's nothing to reset
    } catch {
      setSigningOut(false);   // still here — let them try again
    }
  };

  const statusOpts = [
    { key: "available" as const, label: "Available", emoji: "🟢", color: MINT  },
    { key: "busy"      as const, label: "Busy",      emoji: "🔴", color: CORAL },
    { key: "dnd"       as const, label: "DND",       emoji: "🔕", color: MID   },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: "none", background: BG }}>
      <div className="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Profile</h1>
        <button className="p-2 rounded-xl" style={{ background: CARD }}>
          <Settings size={18} style={{ color: MID }} />
        </button>
      </div>

      <div className="mx-5 rounded-3xl p-5 mb-4 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${SKY}18, ${LAVENDER}18)`, border: `1.5px solid ${SKY}20` }}>
        <div className="relative">
          <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-white"
            style={{ background: `linear-gradient(135deg, ${SKY}, ${LAVENDER})` }}>{initials}</div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white"
            style={{ background: statusOpts.find((s) => s.key === status)?.color ?? MINT }}>
            {status === "available" ? <Check size={13} color={WHITE} /> : status === "busy" ? <Clock size={12} color={WHITE} /> : <EyeOff size={12} color={WHITE} />}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-extrabold" style={{ color: DARK }}>{name || "Your name"}</h2>
          <p className="text-xs mb-2" style={{ color: MID }}>
            {handle ? `@${handle} · ` : ""}San Francisco 📍
          </p>
          <div className="flex gap-4">
            {[["12", "Friends"], ["28", "Plans"], ["94%", "Join Rate"]].map(([val, label]) => (
              <div key={label}>
                <p className="text-base font-extrabold" style={{ color: DARK }}>{val}</p>
                <p className="text-xs" style={{ color: MID }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 flex flex-col gap-3">
        {/* Status */}
        <div className="p-4 rounded-2xl" style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-sm font-extrabold mb-3" style={{ color: DARK }}>My Status</p>
          <div className="flex gap-2">
            {statusOpts.map((s) => (
              <button key={s.key} onClick={() => setStatus(s.key)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-extrabold transition-all"
                style={{
                  background: status === s.key ? s.color + "22" : CARD,
                  border: status === s.key ? `2px solid ${s.color}` : "2px solid transparent",
                  color: status === s.key ? s.color : MID,
                }}>
                {s.emoji}<br />{s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Radius */}
        <div className="p-4 rounded-2xl" style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-extrabold" style={{ color: DARK }}>Notification Radius</p>
              <p className="text-xs mt-0.5" style={{ color: MID }}>Alert me when friends are within…</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl" style={{ background: SKY + "18" }}>
              <span className="text-base font-extrabold" style={{ color: SKY }}>{radius} mi</span>
            </div>
          </div>

          <RadiusSlider value={radius} onChange={setRadius} />
        </div>

        {/* Privacy */}
        <div className="p-4 rounded-2xl flex flex-col gap-4" style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-sm font-extrabold" style={{ color: DARK }}>Privacy & Notifications</p>
          {[
            { label: "Push Notifications", sub: "Coincidences & friend activity", val: notifs, set: setNotifs, color: CORAL },
            { label: "Plan Alerts",         sub: "When friends create nearby plans",val: planNotifs, set: setPlanNotifs, color: SKY },
            { label: "Ghost Mode",          sub: "Hide your location from friends", val: ghost, set: setGhost, color: MID },
          ].map(({ label, sub, val, set, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-extrabold" style={{ color: DARK }}>{label}</p>
                <p className="text-xs" style={{ color: MID }}>{sub}</p>
              </div>
              <Toggle on={val} onToggle={() => set(!val)} color={color} />
            </div>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-3 rounded-2xl text-sm font-extrabold"
          style={{ background: CARD, color: MID, opacity: signingOut ? 0.6 : 1 }}>
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}