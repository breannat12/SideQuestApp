import { Check, MapPin } from "lucide-react";
import { useState } from "react";
import { BG, CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../constants/colors";
import { INITIAL_GROUPS } from "../data/groups";

const ONBOARDING_STEPS_NEW = [
  {
    emoji: "📍", title: "Share your location", color: MINT,
    subtitle: "Only shared with friends you choose.",
    description: "Hango uses your location to find nearby friends and plans. We never store or sell your location data.",
    cta: "Allow Location",
    type: "permission" as const,
  },
  {
    emoji: "🔔", title: "Notification radius", color: SKY,
    subtitle: "How close should a friend be before we ping you?",
    description: "We'll send a nudge when a free friend enters your radius — no spam, just good timing.",
    cta: "Set Radius",
    type: "radius" as const,
  },
  {
    emoji: "👥", title: "Pick your crew", color: LAVENDER,
    subtitle: "Who do you usually hang out with?",
    description: "Choose your groups to personalize your Home feed.",
    cta: "Let's Hang →",
    type: "groups" as const,
  },
];

export function OnboardingScreen({ userName, onComplete }: { userName: string; onComplete: () => void }) {
  const [step, setStep]               = useState(0);
  const [selectedGroups, setSelected] = useState<string[]>([]);
  const [radius, setRadius]           = useState(1.5);
  const s    = ONBOARDING_STEPS_NEW[step];
  const last = step === ONBOARDING_STEPS_NEW.length - 1;
  const firstName = userName.split(" ")[0] || "there";

  const toggle = (g: string) =>
    setSelected((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-25 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${s.color}80 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
      <div className="absolute bottom-24 left-0 w-36 h-36 rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${CORAL}60 0%, transparent 70%)`, transform: "translate(-30%, 0)" }} />

      {/* Skip */}
      {!last && (
        <button className="absolute top-14 right-5 text-xs font-bold z-10" style={{ color: LIGHT }} onClick={onComplete}>
          Skip
        </button>
      )}

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-14 pb-2">
        {ONBOARDING_STEPS_NEW.map((_, i) => (
          <div key={i} className="rounded-full transition-all"
            style={{
              width: i === step ? 24 : 8, height: 8,
              background: i <= step ? s.color : CARD,
            }} />
        ))}
      </div>

      <div className="flex-1 flex flex-col px-7 pt-4">
        {/* Icon */}
        <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl mb-6 mx-auto shadow-md"
          style={{ background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`, border: `2px solid ${s.color}30` }}>
          {s.emoji}
        </div>

        {step === 0 && (
          <p className="text-sm font-extrabold mb-1 text-center" style={{ color: s.color }}>
            Hey, {firstName}! 👋
          </p>
        )}
        <h1 className="text-2xl font-extrabold mb-2 text-center" style={{ color: DARK }}>{s.title}</h1>
        <p className="text-sm text-center leading-relaxed mb-6" style={{ color: MID }}>{s.description}</p>

        {/* Radius step */}
        {s.type === "radius" && (
          <div className="rounded-3xl p-5 mb-4" style={{ background: WHITE, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-extrabold" style={{ color: DARK }}>Alert radius</p>
              <div className="px-3 py-1.5 rounded-xl" style={{ background: s.color + "18" }}>
                <span className="text-base font-extrabold" style={{ color: s.color }}>{radius} mi</span>
              </div>
            </div>
            {/* Custom slider */}
            <div className="relative mb-3">
              <div className="h-3 rounded-full w-full" style={{ background: CARD }} />
              <div className="absolute top-0 left-0 h-3 rounded-full pointer-events-none"
                style={{ width: `${((radius - 0.5) / (5 - 0.5)) * 100}%`, background: `linear-gradient(90deg, ${SKY}, ${LAVENDER})` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-md pointer-events-none"
                style={{
                  left: `calc(${((radius - 0.5) / (5 - 0.5)) * 100}% - 12px)`,
                  background: WHITE, border: `3px solid ${SKY}`,
                  boxShadow: `0 2px 8px ${SKY}50`,
                }} />
              <input type="range" min={0.5} max={5} step={0.5} value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                style={{ height: "100%" }} />
            </div>
            <div className="flex justify-between px-1 mb-3">
              {[0.5, 1, 2, 3, 4, 5].map((v) => (
                <div key={v} className="flex flex-col items-center gap-1">
                  <div className="w-0.5 h-1.5 rounded-full" style={{ background: radius >= v ? SKY : LIGHT }} />
                  <span className="text-xs font-bold" style={{ color: radius === v ? SKY : LIGHT }}>{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-center" style={{ color: LIGHT }}>
              Friends within <strong style={{ color: DARK }}>{radius} miles</strong> who are free will trigger a ping
            </p>
          </div>
        )}

        {/* Groups step */}
        {s.type === "groups" && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {INITIAL_GROUPS.map((g) => {
              const active = selectedGroups.includes(g.name);
              return (
                <button key={g.name} onClick={() => toggle(g.name)}
                  className="flex items-center gap-2.5 p-3.5 rounded-2xl transition-all"
                  style={{
                    background: active ? g.color + "22" : WHITE,
                    border: active ? `2px solid ${g.color}` : "2px solid rgba(0,0,0,0.06)",
                    boxShadow: active ? `0 4px 12px ${g.color}25` : "none",
                  }}>
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="text-left">
                    <p className="text-sm font-extrabold" style={{ color: DARK }}>{g.name}</p>
                    <p className="text-xs" style={{ color: MID }}>{g.count} friends</p>
                  </div>
                  {active && <Check size={14} style={{ color: g.color, marginLeft: "auto" }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Location permission visual */}
        {s.type === "permission" && (
          <div className="rounded-3xl overflow-hidden mb-4" style={{ background: WHITE, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <div className="h-2" style={{ background: `linear-gradient(90deg, ${MINT}, ${SKY})` }} />
            <div className="p-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl mb-3" style={{ background: MINT + "14", border: `1.5px solid ${MINT}30` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: MINT + "25" }}>
                  <MapPin size={18} style={{ color: MINT }} />
                </div>
                <div>
                  <p className="text-sm font-extrabold" style={{ color: DARK }}>While using the app</p>
                  <p className="text-xs" style={{ color: MID }}>Precise location · Friends only</p>
                </div>
                <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: MINT }}>
                  <Check size={12} color={WHITE} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: CARD }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                  <MapPin size={18} style={{ color: LIGHT }} />
                </div>
                <div>
                  <p className="text-sm font-extrabold" style={{ color: MID }}>Always</p>
                  <p className="text-xs" style={{ color: LIGHT }}>Not required</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-7 pb-10 flex-shrink-0">
        <button onClick={() => last ? onComplete() : setStep((p) => p + 1)}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base transition-all"
          style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color === SKY ? LAVENDER : SKY})`, boxShadow: `0 8px 20px ${s.color}35` }}>
          {s.cta}
        </button>
        {step > 0 && (
          <button className="w-full text-center mt-3 text-sm font-bold" style={{ color: LIGHT }}
            onClick={() => setStep((p) => p - 1)}>← Back</button>
        )}
      </div>
    </div>
  );
}