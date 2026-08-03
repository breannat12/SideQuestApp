import { Check, MapPin, Navigation, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toggle } from "../../components/common/Toggle";
import { BG, CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { ACTIVITIES } from "../../data/activities";
import { MIN_QUERY, PLACES_ENABLED, suggestPlaces } from "../../data/places";
import type { Activity, Place } from "../../types";

/** Stand-ins used only when no Geoapify key is configured. */
const LOCATION_PRESETS = [
  "Blue Bottle, Hayes Valley",
  "Sightglass Coffee, SoMa",
  "Dolores Park",
  "Main Library, 4th floor",
  "Tony's Pizza, Union Sq",
  "Tartine Bakery, Mission",
];

/**
 * Long enough that a fast typist doesn't spend a credit per letter. The free
 * plan is a daily quota, so this is cost control as much as it is polish.
 */
const SEARCH_DEBOUNCE_MS = 300;

export function CreateTab({ onCreated }: { onCreated: () => void }) {
  const [step, setStep]         = useState(0);
  const [activity, setAct]      = useState<Activity | null>(null);
  const [time, setTime]         = useState("Now");
  const [group, setGroup]       = useState("Everyone");
  const [flexTime, setFT]       = useState(false);
  const [flexLoc, setFL]        = useState(false);
  const [done, setDone]         = useState(false);
  const [locMode, setLocMode]   = useState<"current" | "custom">("current");
  const [locQuery, setLocQuery] = useState("");

  // Place search
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [place, setPlace]             = useState<Place | null>(null);
  const [searching, setSearching]     = useState(false);
  const [placeError, setPlaceError]   = useState("");

  const locationLabel =
    locMode === "current" ? "Current Location" : (place?.name ?? locQuery.trim()) || "Anywhere nearby";

  const clearLocation = () => {
    setLocQuery("");
    setPlace(null);
    setSuggestions([]);
    setPlaceError("");
  };

  // Debounced type-ahead. The ref keeps a slow early request from landing on
  // top of a newer one — otherwise stale results flash in as you keep typing.
  const queryId = useRef(0);
  useEffect(() => {
    if (!PLACES_ENABLED || locMode !== "custom") return;
    // A picked place already fills the field; don't re-search its own name.
    if (place || locQuery.trim().length < MIN_QUERY) { setSuggestions([]); setSearching(false); return; }

    const id = ++queryId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await suggestPlaces(locQuery);
        if (queryId.current === id) { setSuggestions(found); setPlaceError(""); }
      } catch (err) {
        if (queryId.current === id) {
          setSuggestions([]);
          setPlaceError(err instanceof Error ? err.message : "Couldn't search places.");
        }
      } finally {
        if (queryId.current === id) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [locQuery, locMode, place]);

  /** Results already carry coordinates, so picking one needs no round trip. */
  const choosePlace = (p: Place) => {
    queryId.current++;            // cancel anything still in flight
    setSuggestions([]);
    setSearching(false);
    setLocQuery(p.name);
    setPlace(p);
    setPlaceError("");
  };

  const times  = ["⚡ Now", "In 30 min", "In 1 hr", "In 2 hrs", "Tonight", "Tomorrow"];
  const groups = ["Everyone", "College", "Roommates", "Family", "Clubs"];

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center" style={{ background: BG }}>
        <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center text-6xl mb-6"
          style={{ background: MINT + "22" }}>
          {activity?.emoji ?? "🎉"}
        </div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: DARK }}>Plan Shared! 🚀</h2>
        <p className="text-sm leading-relaxed mb-8" style={{ color: MID }}>
          Your <strong>{activity?.label ?? "plan"}</strong> was sent to <strong>{group}</strong>.
          We'll notify you when friends join!
        </p>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { setDone(false); setStep(0); setAct(null); onCreated(); }}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white"
            style={{ background: `linear-gradient(135deg, ${MINT}, ${SKY})` }}>
            Back to Home
          </button>
          <button onClick={() => { setDone(false); setStep(0); setAct(null); }}
            className="w-full py-3.5 rounded-2xl font-extrabold" style={{ background: CARD, color: MID }}>
            Create Another
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = ["Activity", "Location", "Time", "Who"];

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Create a Plan</h1>
        <p className="text-xs mt-0.5 font-bold" style={{ color: MID }}>Ready in under 10 seconds ⚡</p>
        <div className="flex items-center gap-2 mt-4">
          {stepLabels.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col gap-1">
              <div className="h-1.5 rounded-full transition-all"
                style={{ background: i < step ? MINT : i === step ? SKY : CARD }} />
              <span className="text-xs font-bold" style={{ color: i <= step ? DARK : LIGHT }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: "none" }}>
        <div>
          <p className="text-sm font-extrabold mb-3" style={{ color: DARK }}>What's the vibe?</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {ACTIVITIES.map((a) => {
              const sel = activity?.label === a.label;
              return (
                <button key={a.label} onClick={() => { setAct(a); if (step === 0) setStep(1); }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all"
                  style={{
                    background: sel ? a.color + "22" : CARD,
                    border: sel ? `2px solid ${a.color}` : "2px solid transparent",
                  }}>
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-xs font-extrabold" style={{ color: sel ? DARK : MID }}>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {step >= 1 && (
          <div className="mb-5">
            <p className="text-sm font-extrabold mb-2" style={{ color: DARK }}>Where?</p>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setLocMode("current"); clearLocation(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all"
                style={{ background: locMode === "current" ? SKY : CARD, color: locMode === "current" ? WHITE : MID }}>
                <Navigation size={12} /> Current location
              </button>
              <button onClick={() => setLocMode("custom")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all"
                style={{ background: locMode === "custom" ? MINT : CARD, color: locMode === "custom" ? WHITE : MID }}>
                <MapPin size={12} /> Enter location
              </button>
            </div>

            {locMode === "current" ? (
              <div className="p-3.5 rounded-2xl flex items-center gap-3"
                style={{ background: SKY + "12", border: `1.5px solid ${SKY}30` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: SKY + "20" }}>
                  <Navigation size={16} style={{ color: SKY }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold" style={{ color: DARK }}>Current Location</p>
                  <p className="text-xs" style={{ color: MID }}>Hayes Valley, San Francisco</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: SKY + "20", color: SKY }}>Auto</span>
              </div>
            ) : (
              <div>
                {/* Search input */}
                <div className="flex items-center gap-2 p-3.5 rounded-2xl mb-2"
                  style={{ background: CARD, border: `1.5px solid ${MINT}40` }}>
                  <MapPin size={16} style={{ color: MINT }} />
                  <input
                    autoFocus
                    className="flex-1 text-sm font-extrabold bg-transparent outline-none min-w-0"
                    style={{ color: DARK }}
                    placeholder={PLACES_ENABLED ? "Search a place or address…" : "Type any address or place name…"}
                    value={locQuery}
                    onChange={(e) => { setPlace(null); setLocQuery(e.target.value); }}
                  />
                  {locQuery && (
                    <button onClick={clearLocation} className="flex-shrink-0">
                      <X size={14} style={{ color: LIGHT }} />
                    </button>
                  )}
                </div>

                {placeError && (
                  <p className="text-xs font-bold px-1 mb-2" style={{ color: CORAL }}>{placeError}</p>
                )}

                {/* Autocomplete results */}
                {PLACES_ENABLED && !place && locQuery.trim().length >= MIN_QUERY && (
                  <div>
                    {searching && suggestions.length === 0 && (
                      <p className="text-xs font-bold px-1 py-2" style={{ color: LIGHT }}>Searching…</p>
                    )}
                    {!searching && !placeError && suggestions.length === 0 && (
                      <p className="text-xs font-bold px-1 py-2" style={{ color: LIGHT }}>
                        Nothing found for "{locQuery.trim()}".
                      </p>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {suggestions.map((s) => (
                        <button key={s.id} onClick={() => choosePlace(s)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                          style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: MINT + "20" }}>
                            <MapPin size={13} style={{ color: MINT }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate" style={{ color: DARK }}>{s.name}</p>
                            {s.address && (
                              <p className="text-xs truncate" style={{ color: MID }}>{s.address}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {suggestions.length > 0 && (
                      <p className="text-xs px-1 pt-1.5" style={{ color: LIGHT }}>
                        Search by Geoapify · © OpenStreetMap contributors
                      </p>
                    )}
                  </div>
                )}

                {/* Presets stand in until a Geoapify key is configured */}
                {!PLACES_ENABLED && !locQuery && (
                  <div>
                    <p className="text-xs font-extrabold mb-1.5 px-1" style={{ color: MID }}>NEARBY SPOTS</p>
                    <div className="flex flex-col gap-1.5">
                      {LOCATION_PRESETS.map((l) => (
                        <button key={l} onClick={() => setLocQuery(l)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                          style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)" }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: MINT + "20" }}>
                            <MapPin size={13} style={{ color: MINT }} />
                          </div>
                          <span className="font-bold" style={{ color: DARK }}>{l}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmed pick — a real place when Mapbox resolved it, else raw text */}
                {(place || (!PLACES_ENABLED && locQuery)) && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: MINT + "12", border: `1.5px solid ${MINT}40` }}>
                    <Check size={14} style={{ color: MINT, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold truncate" style={{ color: DARK }}>
                        {place?.name ?? locQuery}
                      </p>
                      {place?.address && (
                        <p className="text-xs truncate" style={{ color: MID }}>{place.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 px-1 mt-2">
              <Toggle on={flexLoc} onToggle={() => setFL(!flexLoc)} color={MINT} />
              <span className="text-xs font-bold" style={{ color: MID }}>Flexible — open to other nearby spots</span>
            </div>
          </div>
        )}

        {step >= 2 && (
          <div className="mb-5">
            <p className="text-sm font-extrabold mb-2" style={{ color: DARK }}>When?</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {times.map((t) => (
                <button key={t} onClick={() => { setTime(t); if (step === 2) setStep(3); }}
                  className="px-3.5 py-2 rounded-xl text-sm font-extrabold transition-all"
                  style={{ background: time === t ? SKY : CARD, color: time === t ? WHITE : DARK }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-1">
              <Toggle on={flexTime} onToggle={() => setFT(!flexTime)} color={MINT} />
              <span className="text-xs font-bold" style={{ color: MID }}>Flexible — open to suggestions</span>
            </div>
          </div>
        )}

        {step >= 3 && (
          <div className="mb-5">
            <p className="text-sm font-extrabold mb-2" style={{ color: DARK }}>Who can join?</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {groups.map((g) => (
                <button key={g} onClick={() => setGroup(g)}
                  className="px-4 py-2 rounded-xl text-sm font-extrabold transition-all"
                  style={{ background: group === g ? LAVENDER : CARD, color: group === g ? WHITE : DARK }}>
                  {g}
                </button>
              ))}
            </div>
            {activity && (
              <div className="rounded-2xl overflow-hidden mb-2"
                style={{ border: `1.5px solid ${activity.color}40`, background: activity.color + "0A" }}>
                <div className="h-1" style={{ background: activity.color }} />
                <div className="p-3.5 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: activity.color + "22" }}>{activity.emoji}</div>
                  <div>
                    <p className="font-extrabold text-sm" style={{ color: DARK }}>{activity.label}</p>
                    <p className="text-xs" style={{ color: MID }}>
                      {time} · {locationLabel} · {group}
                      {flexTime ? " · Flex time" : ""}{flexLoc ? " · Flex loc" : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-4 pt-2 flex-shrink-0">
        {step < 2 && (
          <button onClick={() => setStep((p) => Math.min(p + 1, 3))}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white"
            style={{ background: SKY }}>Continue →</button>
        )}
        {step >= 3 && (
          <button onClick={() => setDone(true)}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white text-base"
            style={{ background: `linear-gradient(135deg, ${MINT}, ${SKY})` }}>
            🚀 Share Plan!
          </button>
        )}
      </div>
    </div>
  );
}