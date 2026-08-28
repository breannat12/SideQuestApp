import { Check, ChevronDown, Clock, MapPin, Navigation, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClockPickerModal, defaultClock } from "../../components/common/ClockPicker";
import { Toggle } from "../../components/common/Toggle";
import { BG, CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { DEFAULT_PLAN_EMOJI, PLAN_EMOJIS } from "../../data/activities";
import { useCurrentUser } from "../../data/currentUser";
import { useMyFriends } from "../../data/friends";
import { useMyGroups } from "../../data/groups";
import { describeCoords, getMyCoords, MIN_QUERY, PLACES_ENABLED, suggestPlaces } from "../../data/places";
import {
  clockLabel, createPlan, CURRENT_LOCATION, planErrorMessage, QUICK_TIMES,
  startsAtFor, startsAtForClock,
} from "../../data/plans";
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

export function CreateTab({ onCreated }: { onCreated: () => void }) {
  const { name: hostName }      = useCurrentUser();
  const { groups: myGroups }    = useMyGroups();
  const { friends }             = useMyFriends();
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
    locMode === "current" ? CURRENT_LOCATION : (place?.name ?? locQuery.trim()) || "Anywhere nearby";

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
      // Coordinates are what let friends sort by distance later. A picked place
      // brings its own; "Current Location" means here, so ask where that is.
      // Either can come back empty — a plan without them simply carries no
      // distance, which is better than blocking the share on a location fix.
      const coords =
        locMode === "current"
          ? await getMyCoords().catch(() => null)
          : place
            ? { lat: place.lat, lng: place.lng }
            : null;

      // "Current Location" is a placeholder that only means anything to the
      // person who chose it — to everyone it's shared with it names nowhere. So
      // it's resolved to a real place here, once, and that's what's stored.
      // Falls back to the placeholder if the lookup can't be made; a plan that
      // reads vaguely beats a share that failed.
      const resolved =
        locMode === "current" && coords ? await describeCoords(coords) : null;

      await createPlan({
        title:    planTitle,
        emoji:    badge.emoji,
        color:    badge.color,
        timeLabel,
        startsAt: clock ? startsAtForClock(clock) : startsAtFor(time),
        location: resolved ?? locationLabel,
        group,
        flexTime,
        flexLoc,
        lat: coords?.lat,
        lng: coords?.lng,
      }, hostName, audienceUids);
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

  const times = QUICK_TIMES;
  /** Everyone, plus whatever groups you've actually made. */
  const groupChoices = ["Everyone", ...myGroups.map((g) => g.name)];

  /**
   * Who the plan goes out to: every friend, or just one group's members. This
   * is what decides whose Explore tab it lands on, so picking a group here is a
   * real audience choice rather than a label.
   */
  const audienceUids =
    group === "Everyone"
      ? friends.map((f) => f.uid)
      : myGroups.find((g) => g.name === group)?.memberUids ?? [];

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center" style={{ background: BG }}>
        <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center text-6xl mb-6"
          style={{ background: badge.color + "22" }}>
          {badge.emoji}
        </div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: DARK }}>Sidequest Shared! 🚀</h2>
        {/* Says who it actually reached. A plan with no audience is only ever
            on your own Home tab, and that shouldn't read as "shared". */}
        <p className="text-sm leading-relaxed mb-8" style={{ color: MID }}>
          {audienceUids.length === 0 ? (
            <>
              Your <strong>{planTitle}</strong> is on your Home tab. Add friends
              to <strong>{group}</strong> and your next sidequest reaches them too.
            </>
          ) : (
            <>
              Your <strong>{planTitle}</strong> went out to{" "}
              <strong>{audienceUids.length} {audienceUids.length === 1 ? "friend" : "friends"}</strong>
              {group === "Everyone" ? "" : <> in <strong>{group}</strong></>}.
              We'll notify you when they join!
            </>
          )}
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
        <h1 className="text-2xl font-extrabold" style={{ color: DARK }}>Create a Sidequest</h1>
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
          <p className="text-sm font-extrabold mb-3" style={{ color: DARK }}>Name your sidequest</p>

          {/* The chosen emoji sits beside the field, so the badge the plan will
              actually carry is visible while you're naming it. The chevron is
              the affordance — the full set only appears once you ask for it. */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setEmojiOpen((o) => !o)}
              aria-label="Change sidequest emoji"
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
              {groupChoices.map((g) => (
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
                    {planTitle || "Untitled sidequest"}
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
            {named ? "Continue →" : "Name your sidequest to continue"}
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
              {sharing ? "Sharing…" : "🚀 Share Sidequest!"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}