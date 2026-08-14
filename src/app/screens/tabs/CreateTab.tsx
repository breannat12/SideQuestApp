import { Check, ChevronDown, Clock, MapPin, Navigation, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toggle } from "../../components/common/Toggle";
import { BG, CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { DEFAULT_PLAN_EMOJI, PLAN_EMOJIS } from "../../data/activities";
import { useCurrentUser } from "../../data/currentUser";
import { MIN_QUERY, PLACES_ENABLED, suggestPlaces } from "../../data/places";
import { clockLabel, createPlan, planErrorMessage, startsAtFor, startsAtForClock } from "../../data/plans";
import type { ClockTime } from "../../data/plans";
import type { Place } from "../../types";

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

/** Long enough for "Leg day with the roommates", short enough to fit a card. */
const TITLE_MAX = 40;

/** Five-minute steps: fine enough to meet at 7:45, short enough to scroll. */
const MINUTE_STEP = 5;
const HOURS    = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES  = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
const MERIDIEM = ["AM", "PM"] as const;

/** Opens the picker on the next round slot rather than on a stale midnight. */
function defaultClock(): ClockTime {
  const at = new Date();
  at.setMinutes(at.getMinutes() + MINUTE_STEP, 0, 0);
  at.setMinutes(Math.ceil(at.getMinutes() / MINUTE_STEP) * MINUTE_STEP);
  const h = at.getHours();
  return {
    hour: h % 12 === 0 ? 12 : h % 12,
    minute: at.getMinutes(),
    meridiem: h < 12 ? "AM" : "PM",
  };
}

/** Wheel geometry: an odd count keeps one row centred under the highlight. */
const ITEM_H  = 40;
const VISIBLE = 5;
/** Blank space above/below the list so the ends can still reach the middle. */
const WHEEL_PAD = ITEM_H * ((VISIBLE - 1) / 2);

/**
 * One column of the wheel. The selection is whatever has settled in the middle
 * row, so scrolling *is* picking — tapping a value just scrolls it there.
 */
function WheelColumn<T extends string | number>({
  values, index, onIndex, format,
}: {
  values: readonly T[];
  index: number;
  onIndex: (i: number) => void;
  format?: (v: T) => string;
}) {
  const box   = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  // Jump to the current value on open. Not on every change — re-centring
  // mid-drag would fight the finger that's doing the scrolling.
  useEffect(() => {
    if (box.current) box.current.scrollTop = index * ITEM_H;
    return () => cancelAnimationFrame(frame.current);
  }, []);

  /** Coalesced to one read per frame; scroll events fire far faster than that. */
  const handleScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = box.current;
      if (!el) return;
      const i = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_H)));
      if (i !== index) onIndex(i);
    });
  };

  return (
    <div ref={box} onScroll={handleScroll} className="flex-1 min-w-0 overflow-y-auto"
      style={{
        height: ITEM_H * VISIBLE,
        paddingTop: WHEEL_PAD,
        paddingBottom: WHEEL_PAD,
        scrollSnapType: "y mandatory",
        // Keeps a flick at the end of the wheel from scrolling the form behind.
        overscrollBehavior: "contain",
        scrollbarWidth: "none",
      }}>
      {values.map((v, i) => {
        const away = Math.abs(i - index);
        return (
          <button key={String(v)}
            onClick={() => box.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" })}
            className="w-full flex items-center justify-center transition-all"
            style={{
              height: ITEM_H,
              scrollSnapAlign: "center",
              color: away === 0 ? DARK : MID,
              opacity: away === 0 ? 1 : away === 1 ? 0.5 : 0.22,
              fontWeight: away === 0 ? 800 : 700,
              fontSize: away === 0 ? 19 : 17,
            }}>
            {format ? format(v) : v}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Modal wheel picker. It dims the form rather than sitting inside it: the
 * columns need real drag room, and half a screen of chips underneath reads as
 * two competing ways to answer the same question.
 */
function ClockPickerModal({
  value, onCancel, onConfirm,
}: {
  value: ClockTime;
  onCancel: () => void;
  onConfirm: (t: ClockTime) => void;
}) {
  const [draft, setDraft] = useState<ClockTime>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8"
      style={{ background: "rgba(0,0,0,0.42)" }}
      onClick={onCancel}>
      <div className="w-full rounded-3xl overflow-hidden"
        style={{ maxWidth: 320, background: WHITE, boxShadow: "0 12px 40px rgba(0,0,0,0.22)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <p className="text-sm font-extrabold" style={{ color: DARK }}>Pick a time</p>
          <button onClick={onCancel} aria-label="Close time picker">
            <X size={16} style={{ color: LIGHT }} />
          </button>
        </div>

        <div className="relative mx-3 mt-1">
          {/* The one lit row. Sits behind the columns so all three read as one. */}
          <div className="absolute left-0 right-0 rounded-2xl pointer-events-none"
            style={{ top: WHEEL_PAD, height: ITEM_H, background: SKY + "1F" }} />
          {/* Fades the values as they leave the wheel, top and bottom. */}
          <div className="absolute inset-x-0 top-0 pointer-events-none"
            style={{ height: WHEEL_PAD, background: `linear-gradient(${WHITE}, ${WHITE}00)` }} />
          <div className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{ height: WHEEL_PAD, background: `linear-gradient(${WHITE}00, ${WHITE})` }} />

          <div className="flex items-stretch">
            <WheelColumn values={HOURS} index={HOURS.indexOf(draft.hour)}
              onIndex={(i) => setDraft((d) => ({ ...d, hour: HOURS[i] }))} />
            <WheelColumn values={MINUTES} index={MINUTES.indexOf(draft.minute)}
              format={(m) => String(m).padStart(2, "0")}
              onIndex={(i) => setDraft((d) => ({ ...d, minute: MINUTES[i] }))} />
            <WheelColumn values={MERIDIEM} index={MERIDIEM.indexOf(draft.meridiem)}
              onIndex={(i) => setDraft((d) => ({ ...d, meridiem: MERIDIEM[i] }))} />
          </div>
        </div>

        <div className="px-4 pb-4 pt-1">
          <p className="text-xs font-bold text-center mb-2.5" style={{ color: MID }}>
            Starts {clockLabel(draft)}
          </p>
          <button onClick={() => onConfirm(draft)}
            className="w-full py-3 rounded-2xl font-extrabold text-white"
            style={{ background: `linear-gradient(135deg, ${MINT}, ${SKY})` }}>
            Set time
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateTab({ onCreated }: { onCreated: () => void }) {
  const { name: hostName }      = useCurrentUser();
  const [step, setStep]         = useState(0);
  const [title, setTitle]       = useState("");
  const [badge, setBadge]       = useState(DEFAULT_PLAN_EMOJI);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sharing, setSharing]     = useState(false);
  const [shareError, setShareError] = useState("");
  const [time, setTime]         = useState("Now");
  /** Non-null once a time is picked by hand; that pick wins over the chips. */
  const [clock, setClock]       = useState<ClockTime | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const timeLabel = clock ? clockLabel(clock) : time;

  const planTitle = title.trim();
  /** The name is what identifies a plan now, so nothing ships without one. */
  const named = planTitle.length > 0;

  /** Clears everything the two post-share buttons have in common. */
  const resetForm = () => {
    setDone(false);
    setStep(0);
    setTitle("");
    setBadge(DEFAULT_PLAN_EMOJI);
    setEmojiOpen(false);
    setPickerOpen(false);
    setShareError("");
  };

  /**
   * Waits for the server rather than showing the success screen straight away:
   * a plan that failed on rules would otherwise read as shared and then never
   * turn up on Home.
   */
  const share = async () => {
    if (!named || sharing) return;
    setSharing(true);
    setShareError("");
    try {
      await createPlan({
        title:    planTitle,
        emoji:    badge.emoji,
        color:    badge.color,
        timeLabel,
        startsAt: clock ? startsAtForClock(clock) : startsAtFor(time),
        location: locationLabel,
        group,
        flexTime,
        flexLoc,
      }, hostName);
      setDone(true);
    } catch (err) {
      setShareError(planErrorMessage(err));
    } finally {
      setSharing(false);
    }
  };

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
          style={{ background: badge.color + "22" }}>
          {badge.emoji}
        </div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: DARK }}>Plan Shared! 🚀</h2>
        <p className="text-sm leading-relaxed mb-8" style={{ color: MID }}>
          Your <strong>{planTitle}</strong> was sent to <strong>{group}</strong>.
          We'll notify you when friends join!
        </p>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { resetForm(); onCreated(); }}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white"
            style={{ background: `linear-gradient(135deg, ${MINT}, ${SKY})` }}>
            Back to Home
          </button>
          <button onClick={resetForm}
            className="w-full py-3.5 rounded-2xl font-extrabold" style={{ background: CARD, color: MID }}>
            Create Another
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = ["Name", "Location", "Time", "Who"];

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      {pickerOpen && (
        <ClockPickerModal
          value={clock ?? defaultClock()}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(t) => { setClock(t); setPickerOpen(false); if (step === 2) setStep(3); }}
        />
      )}

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
        <div className="mb-6">
          <p className="text-sm font-extrabold mb-3" style={{ color: DARK }}>Name your plan</p>

          {/* The chosen emoji sits beside the field, so the badge the plan will
              actually carry is visible while you're naming it. The chevron is
              the affordance — the full set only appears once you ask for it. */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setEmojiOpen((o) => !o)}
              aria-label="Change plan emoji"
              className="relative rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-all"
              style={{
                width: 56, height: 56,
                background: badge.color + "22",
                border: `2px solid ${badge.color}${emojiOpen ? "" : "40"}`,
              }}>
              {badge.emoji}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
                style={{ background: WHITE, borderColor: BG, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                <ChevronDown size={11} strokeWidth={3}
                  style={{ color: badge.color, transform: emojiOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </span>
            </button>
            <div className="flex-1 flex items-center gap-2 p-3.5 rounded-2xl min-w-0"
              style={{ background: CARD, border: `1.5px solid ${badge.color}40` }}>
              <input
                autoFocus
                className="flex-1 text-sm font-extrabold bg-transparent outline-none min-w-0"
                style={{ color: DARK }}
                placeholder="Coffee run, gym sesh, movie night…"
                maxLength={TITLE_MAX}
                value={title}
                // Naming it is enough to get going — no need to hit Continue.
                onChange={(e) => { setTitle(e.target.value); if (step === 0 && e.target.value.trim()) setStep(1); }}
              />
              {title && (
                <button onClick={() => setTitle("")} className="flex-shrink-0">
                  <X size={14} style={{ color: LIGHT }} />
                </button>
              )}
            </div>
          </div>

          {/* Scrolls past the first couple of rows rather than pushing the rest
              of the form off-screen, the way a keyboard panel would. */}
          {emojiOpen && (
            <div className="rounded-2xl p-2.5"
              style={{ background: WHITE, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
              <div className="grid grid-cols-6 gap-1 overflow-y-auto"
                style={{ maxHeight: 168, scrollbarWidth: "none" }}>
                {PLAN_EMOJIS.map((e) => {
                  const sel = badge.emoji === e.emoji;
                  return (
                    <button key={e.emoji}
                      onClick={() => { setBadge(e); setEmojiOpen(false); }}
                      className="flex items-center justify-center py-2 rounded-xl text-2xl transition-all"
                      style={{
                        background: sel ? e.color + "22" : "transparent",
                        border: sel ? `2px solid ${e.color}` : "2px solid transparent",
                      }}>
                      {e.emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
              {times.map((t) => {
                const sel = !clock && time === t;
                return (
                  <button key={t} onClick={() => { setClock(null); setTime(t); if (step === 2) setStep(3); }}
                    className="px-3.5 py-2 rounded-xl text-sm font-extrabold transition-all"
                    style={{ background: sel ? SKY : CARD, color: sel ? WHITE : DARK }}>
                    {t}
                  </button>
                );
              })}
              {/* Reopens on the time already chosen, so a tweak isn't a redo. */}
              <button onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-extrabold transition-all"
                style={{ background: clock ? SKY : CARD, color: clock ? WHITE : DARK }}>
                <Clock size={13} /> {clock ? clockLabel(clock) : "Pick a time"}
              </button>
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
            <div className="rounded-2xl overflow-hidden mb-2"
              style={{ border: `1.5px solid ${badge.color}40`, background: badge.color + "0A" }}>
              <div className="h-1" style={{ background: badge.color }} />
              <div className="p-3.5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: badge.color + "22" }}>{badge.emoji}</div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm truncate" style={{ color: DARK }}>
                    {planTitle || "Untitled plan"}
                  </p>
                  <p className="text-xs" style={{ color: MID }}>
                    {timeLabel} · {locationLabel} · {group}
                    {flexTime ? " · Flex time" : ""}{flexLoc ? " · Flex loc" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-4 pt-2 flex-shrink-0">
        {step < 2 && (
          <button
            disabled={!named}
            onClick={() => setStep((p) => Math.min(p + 1, 3))}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white"
            style={{ background: named ? SKY : LIGHT }}>
            {named ? "Continue →" : "Name your plan to continue"}
          </button>
        )}
        {step >= 3 && (
          <>
            {shareError && (
              <p className="text-xs font-bold text-center mb-2 px-1" style={{ color: CORAL }}>{shareError}</p>
            )}
            <button
              disabled={!named || sharing}
              onClick={share}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-base"
              style={{
                background: named && !sharing ? `linear-gradient(135deg, ${MINT}, ${SKY})` : LIGHT,
              }}>
              {sharing ? "Sharing…" : "🚀 Share Plan!"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}