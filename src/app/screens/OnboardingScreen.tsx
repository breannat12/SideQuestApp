import { Check, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BG, CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, PEACH, SKY, WHITE } from "../constants/colors";
import { addFriends, searchUsersByUsername } from "../data/users";
import type { DirectoryUser } from "../types";

/** Avatar colors, picked off the handle so a person keeps the same one. */
const AVATAR_COLORS = [SKY, MINT, CORAL, LAVENDER, PEACH];
const colorFor = (key: string) => {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
const initialsFor = (u: DirectoryUser) =>
  (u.name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || u.username.slice(0, 2))
    .toUpperCase();

/** Long enough that typing a handle doesn't fire a read per keystroke. */
const SEARCH_DEBOUNCE_MS = 300;

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
    emoji: "👥", title: "Find your people", color: LAVENDER,
    subtitle: "Know someone already on Sidequest?",
    description: "Search a username to add them, or skip and do this later.",
    cta: "Let's Hang →",
    type: "friends" as const,
  },
];

export function OnboardingScreen({ userName, onComplete }: { userName: string; onComplete: () => void }) {
  const [step, setStep]     = useState(0);
  const [radius, setRadius] = useState(1.5);

  // Friend-finder state
  const [term, setTerm]         = useState("");
  const [results, setResults]   = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [picked, setPicked]     = useState<DirectoryUser[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");

  const s    = ONBOARDING_STEPS_NEW[step];
  const last = step === ONBOARDING_STEPS_NEW.length - 1;
  const onFriends = s.type === "friends";
  const firstName = userName.split(" ")[0] || "there";

  const togglePick = (u: DirectoryUser) =>
    setPicked((p) => p.some((x) => x.uid === u.uid) ? p.filter((x) => x.uid !== u.uid) : [...p, u]);

  // Runs on arrival (empty term → suggestions) and on every edit after that.
  // The ref makes a slow earlier query lose to a newer one instead of
  // overwriting it when it finally lands.
  const queryId = useRef(0);
  useEffect(() => {
    if (!onFriends) return;
    const id = ++queryId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchUsersByUsername(term);
        if (queryId.current === id) { setResults(found); setSearchError(""); }
      } catch {
        if (queryId.current === id) { setResults([]); setSearchError("Couldn't load users. Check your connection."); }
      } finally {
        if (queryId.current === id) setSearching(false);
      }
    }, term ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(t);
  }, [term, onFriends]);

  /**
   * Fires the real browser permission prompt. Granting it is what lets place
   * search bias results to nearby spots later — without it, searching "blue
   * bottle" ranks a reservoir in Wyoming over the cafe down the street.
   * Advances either way: a declined prompt shouldn't trap anyone in onboarding.
   */
  const askForLocation = () => {
    const next = () => setStep((p) => p + 1);
    if (!navigator.geolocation) return next();
    navigator.geolocation.getCurrentPosition(next, next, { timeout: 8000 });
  };

  /** Saves the picks (if any) before handing control back to the app. */
  const finish = async () => {
    if (saving) return;
    if (!picked.length) return onComplete();
    setSaving(true);
    setSaveError("");
    try {
      await addFriends(picked);
      onComplete();
    } catch {
      setSaveError("Couldn't add those friends. Try again or skip for now.");
      setSaving(false);
    }
  };

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

      {/* The friend list scrolls, so this step trades header room for rows */}
      <div className="flex-1 flex flex-col min-h-0 px-7 pt-4">
        {/* Icon */}
        <div className={`rounded-[2rem] flex items-center justify-center mx-auto shadow-md flex-shrink-0 ${
            onFriends ? "w-16 h-16 text-3xl mb-3" : "w-24 h-24 text-5xl mb-6"}`}
          style={{ background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`, border: `2px solid ${s.color}30` }}>
          {s.emoji}
        </div>

        {step === 0 && (
          <p className="text-sm font-extrabold mb-1 text-center" style={{ color: s.color }}>
            Hey, {firstName}! 👋
          </p>
        )}
        <h1 className={`font-extrabold text-center flex-shrink-0 ${onFriends ? "text-xl mb-1" : "text-2xl mb-2"}`}
          style={{ color: DARK }}>{s.title}</h1>
        <p className={`text-sm text-center leading-relaxed flex-shrink-0 ${onFriends ? "mb-4" : "mb-6"}`}
          style={{ color: MID }}>{s.description}</p>

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

        {/* Friend finder step */}
        {onFriends && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search bar */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl mb-3 flex-shrink-0"
              style={{
                background: WHITE,
                border: `2px solid ${term ? s.color : "rgba(0,0,0,0.06)"}`,
                boxShadow: term ? `0 0 0 3px ${s.color}18` : "none",
              }}>
              <Search size={17} style={{ color: term ? s.color : LIGHT }} />
              <input
                className="flex-1 text-base font-extrabold bg-transparent outline-none min-w-0"
                style={{ color: DARK }}
                placeholder="Search usernames"
                value={term}
                onChange={(e) => setTerm(e.target.value.replace(/[^a-zA-Z0-9_.@]/g, "").slice(0, 20))}
              />
              {term && (
                <button onClick={() => setTerm("")} className="flex-shrink-0">
                  <X size={16} style={{ color: LIGHT }} />
                </button>
              )}
            </div>

            {/* Picked, so they stay visible after the search moves on */}
            {picked.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 flex-shrink-0">
                {picked.map((u) => (
                  <button key={u.uid} onClick={() => togglePick(u)}
                    className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full flex-shrink-0"
                    style={{ background: WHITE, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-black"
                      style={{ background: colorFor(u.username), fontSize: 9 }}>
                      {initialsFor(u)}
                    </div>
                    <span className="text-xs font-extrabold" style={{ color: DARK }}>@{u.username}</span>
                    <X size={12} style={{ color: LIGHT }} />
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 pb-2">
              {searching && (
                <p className="text-sm font-bold text-center py-8" style={{ color: LIGHT }}>Searching…</p>
              )}
              {!searching && searchError && (
                <p className="text-sm font-bold text-center py-8 px-4" style={{ color: CORAL }}>{searchError}</p>
              )}
              {!searching && !searchError && results.length === 0 && (
                <div className="text-center py-8 px-4">
                  <p className="text-sm font-extrabold mb-1" style={{ color: MID }}>
                    {term ? `No one goes by @${term.replace(/^@/, "")}` : "No one else here yet"}
                  </p>
                  <p className="text-xs" style={{ color: LIGHT }}>
                    {term ? "Check the spelling, or skip for now." : "You're early — invite friends once you're in."}
                  </p>
                </div>
              )}
              {!searching && results.map((u) => {
                const active = picked.some((x) => x.uid === u.uid);
                const color  = colorFor(u.username);
                return (
                  <button key={u.uid} onClick={() => togglePick(u)}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-all flex-shrink-0"
                    style={{
                      background: active ? color + "18" : WHITE,
                      border: active ? `2px solid ${color}` : "2px solid rgba(0,0,0,0.06)",
                      boxShadow: active ? `0 4px 12px ${color}25` : "none",
                    }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}AA)` }}>
                      {initialsFor(u)}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-extrabold truncate" style={{ color: DARK }}>{u.name || `@${u.username}`}</p>
                      <p className="text-xs truncate" style={{ color: MID }}>@{u.username}</p>
                    </div>
                    <div className="ml-auto w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: active ? color : CARD }}>
                      {active ? <Check size={14} color={WHITE} /> : <Plus size={14} style={{ color: MID }} />}
                    </div>
                  </button>
                );
              })}
            </div>
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

      <div className="px-7 pb-10 pt-3 flex-shrink-0">
        {saveError && (
          <p className="text-xs font-bold text-center mb-3 px-1" style={{ color: CORAL }}>{saveError}</p>
        )}
        <button disabled={saving}
          onClick={() => last ? finish() : s.type === "permission" ? askForLocation() : setStep((p) => p + 1)}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base transition-all"
          style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color === SKY ? LAVENDER : SKY})`, boxShadow: `0 8px 20px ${s.color}35`, opacity: saving ? 0.6 : 1 }}>
          {saving
            ? "Adding friends…"
            : onFriends && picked.length
              ? `Add ${picked.length} friend${picked.length > 1 ? "s" : ""} →`
              : s.cta}
        </button>
        {onFriends ? (
          <div className="flex items-center justify-between mt-3 text-sm font-bold" style={{ color: LIGHT }}>
            <button onClick={() => setStep((p) => p - 1)}>← Back</button>
            <button onClick={onComplete}>Skip for now</button>
          </div>
        ) : step > 0 && (
          <button className="w-full text-center mt-3 text-sm font-bold" style={{ color: LIGHT }}
            onClick={() => setStep((p) => p - 1)}>← Back</button>
        )}
      </div>
    </div>
  );
}