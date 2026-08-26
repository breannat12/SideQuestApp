import { Check, Clock, MapPin, Navigation, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CARD, CORAL, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { useCurrentUser } from "../../data/currentUser";
import { describeCoords, getMyCoords, MIN_QUERY, PLACES_ENABLED, suggestPlaces } from "../../data/places";
import {
  clockLabel, locationLabel, planErrorMessage, QUICK_TIMES, startsAtFor,
  startsAtForClock, suggestChange,
} from "../../data/plans";
import type { ClockTime, NewSuggestion } from "../../data/plans";
import type { Place, Plan } from "../../types";
import { ClockPickerModal, defaultClock } from "../common/ClockPicker";

/** Matches the debounce on the create and edit flows — same quota, same reasoning. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Proposes a different time or place on a plan someone else hosts.
 *
 * The same two pickers as the edit sheet, and deliberately so — a friend
 * suggesting 8pm and a host setting 8pm should be choosing from one control,
 * not two that drift. What differs is where it lands: this writes a suggestion
 * onto the plan for its host to read, rather than moving the plan itself.
 *
 * Only the parts the host marked flexible are offered. A plan that's flexible
 * on time alone opens straight onto time with no tab to switch.
 */
export function SuggestSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { name: myName } = useCurrentUser();

  const canTime  = Boolean(plan.flexTime);
  const canPlace = Boolean(plan.flexLoc);
  const [tab, setTab] = useState<"time" | "place">(canTime ? "time" : "place");

  // Time
  const [quick, setQuick] = useState<string | null>(null);
  const [clock, setClock] = useState<ClockTime | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Place
  const [locMode, setLocMode]   = useState<"current" | "custom">("custom");
  const [locQuery, setLocQuery] = useState("");
  const [place, setPlace]       = useState<Place | null>(null);
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching]     = useState(false);
  const [placeError, setPlaceError]   = useState("");

  const [sending, setSending]   = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent]         = useState(false);
  const [sentValue, setSentValue] = useState("");

  const timeLabel   = clock ? clockLabel(clock) : quick;
  const placeLabel  = locMode === "current" ? "Where I am now" : (place?.name ?? locQuery.trim());
  const canSend     = tab === "time" ? Boolean(timeLabel) : Boolean(placeLabel);

  // Debounced type-ahead, same guard against a slow early request landing late.
  const queryId = useRef(0);
  useEffect(() => {
    if (!PLACES_ENABLED || tab !== "place" || locMode !== "custom") return;
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
  }, [locQuery, locMode, place, tab]);

  const choosePlace = (p: Place) => {
    queryId.current++;
    setSuggestions([]);
    setSearching(false);
    setLocQuery(p.name);
    setPlace(p);
    setPlaceError("");
  };

  const clearLocation = () => {
    setLocQuery("");
    setPlace(null);
    setSuggestions([]);
    setPlaceError("");
  };

  const send = async () => {
    if (!canSend || sending) return;
    setSending(true);
    setSendError("");
    try {
      let sent: NewSuggestion;
      if (tab === "time") {
        // The moment travels with the label: the host accepting this has to be
        // able to set a real start time, and "Tomorrow 9:40 AM" won't reparse.
        sent = {
          kind: "time",
          value: timeLabel!,
          startsAt: clock ? startsAtForClock(clock) : startsAtFor(timeLabel!),
        };
      } else if (locMode === "current") {
        // Resolved to a real name for the same reason the create flow does it:
        // "where I am now" means nothing to the person reading the suggestion.
        const coords = await getMyCoords().catch(() => null);
        sent = {
          kind:  "location",
          value: (coords ? await describeCoords(coords) : null) ?? placeLabel,
          lat:   coords?.lat,
          lng:   coords?.lng,
        };
      } else {
        sent = { kind: "location", value: placeLabel, lat: place?.lat, lng: place?.lng };
      }

      await suggestChange(plan.id, sent, myName);
      setSentValue(sent.value);
      setSent(true);
    } catch (err) {
      setSendError(planErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
        <div className="rounded-t-3xl flex flex-col items-center justify-center py-10 px-6 gap-4"
          style={{ background: WHITE }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: SKY + "20" }}>💡</div>
          <h3 className="text-lg font-extrabold text-center" style={{ color: DARK }}>Suggestion sent!</h3>
          <p className="text-sm text-center leading-relaxed" style={{ color: MID }}>
            You suggested {sentValue} for {plan.activity}.
            <br />{plan.host} gets a notification — it's still their plan to move.
          </p>
          <button onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white"
            style={{ background: MINT }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
      {pickerOpen && (
        <ClockPickerModal
          value={clock ?? defaultClock()}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(t) => { setClock(t); setQuick(null); setPickerOpen(false); }}
        />
      )}

      <div className="rounded-t-3xl overflow-hidden flex flex-col" style={{ background: WHITE, maxHeight: "82%" }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: CARD }} />
        </div>

        <div className="px-5 pb-3 flex items-start justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold" style={{ color: DARK }}>Suggest a change</h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: MID }}>
              for <span className="font-extrabold" style={{ color: DARK }}>{plan.emoji} {plan.activity}</span> by {plan.host}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0"
            style={{ background: CARD }}>
            <X size={14} style={{ color: MID }} />
          </button>
        </div>

        {/* Only shown when both halves are open to suggestions — with one, the
            tab row would be a control with nothing to switch between. */}
        {canTime && canPlace && (
          <div className="flex gap-2 px-5 pt-4 pb-3">
            {(["time", "place"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold transition-all"
                style={{ background: tab === t ? DARK : CARD, color: tab === t ? WHITE : MID }}>
                {t === "time" ? "🕐 Another time" : "📍 Another place"}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4" style={{ scrollbarWidth: "none" }}>
          <div className="rounded-2xl p-3 mb-4 flex items-center gap-3"
            style={{ background: plan.accentColor + "14", border: `1.5px dashed ${plan.accentColor}50` }}>
            <span className="text-base">{tab === "time" ? "⏰" : "📍"}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold" style={{ color: MID }}>{plan.host}'s {tab}</p>
              <p className="text-sm font-extrabold truncate" style={{ color: DARK }}>
                {tab === "time" ? plan.time : locationLabel(plan)}
              </p>
            </div>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
              style={{ background: MINT + "30", color: MINT }}>Flexible</span>
          </div>

          <p className="text-xs font-extrabold mb-2" style={{ color: MID }}>
            SUGGEST INSTEAD
          </p>

          {tab === "time" ? (
            <div className="flex flex-col gap-2 mb-4">
              {QUICK_TIMES.map((t) => {
                const on = !clock && quick === t;
                return (
                  <button key={t} onClick={() => { setQuick(t); setClock(null); }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                    style={{
                      background: on ? SKY + "18" : CARD,
                      border: on ? `2px solid ${SKY}` : "2px solid transparent",
                    }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: SKY + "20" }}>
                      <Clock size={15} style={{ color: SKY }} />
                    </div>
                    <span className="text-sm font-extrabold flex-1 text-left" style={{ color: DARK }}>{t}</span>
                    {on && <Check size={15} style={{ color: SKY }} />}
                  </button>
                );
              })}

              <button onClick={() => setPickerOpen(true)}
                className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                style={{
                  background: clock ? SKY + "18" : CARD,
                  border: clock ? `2px solid ${SKY}` : "2px dashed rgba(0,0,0,0.12)",
                }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: SKY + "20" }}>
                  <Clock size={15} style={{ color: SKY }} />
                </div>
                <span className="text-sm font-extrabold flex-1 text-left" style={{ color: clock ? DARK : MID }}>
                  {clock ? clockLabel(clock) : "Pick a time…"}
                </span>
                {clock && <Check size={15} style={{ color: SKY }} />}
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setLocMode("current"); clearLocation(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all"
                  style={{ background: locMode === "current" ? SKY : CARD, color: locMode === "current" ? WHITE : MID }}>
                  <Navigation size={12} /> Where I am
                </button>
                <button onClick={() => setLocMode("custom")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all"
                  style={{ background: locMode === "custom" ? MINT : CARD, color: locMode === "custom" ? WHITE : MID }}>
                  <MapPin size={12} /> Somewhere else
                </button>
              </div>

              {locMode === "current" ? (
                <div className="p-3.5 rounded-2xl flex items-center gap-3"
                  style={{ background: SKY + "12", border: `1.5px solid ${SKY}30` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: SKY + "20" }}>
                    <Navigation size={16} style={{ color: SKY }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold" style={{ color: DARK }}>Where I am now</p>
                    <p className="text-xs" style={{ color: MID }}>Sent as the actual place name</p>
                  </div>
                </div>
              ) : (
                <div>
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
                              {s.address && <p className="text-xs truncate" style={{ color: MID }}>{s.address}</p>}
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

                  {(place || (!PLACES_ENABLED && locQuery.trim())) && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: MINT + "12", border: `1.5px solid ${MINT}40` }}>
                      <Check size={14} style={{ color: MINT, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold truncate" style={{ color: DARK }}>
                          {place?.name ?? locQuery.trim()}
                        </p>
                        {place?.address && <p className="text-xs truncate" style={{ color: MID }}>{place.address}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-6 pt-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          {sendError && (
            <p className="text-xs font-bold text-center mb-2 px-1" style={{ color: CORAL }}>{sendError}</p>
          )}
          <button
            disabled={!canSend || sending}
            onClick={send}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white transition-all"
            style={{ background: canSend && !sending ? `linear-gradient(135deg, ${SKY}, ${LAVENDER})` : LIGHT }}>
            {sending ? "Sending…" : "Send suggestion"}
          </button>
          <p className="text-xs text-center mt-2" style={{ color: LIGHT }}>
            {plan.host} decides — this doesn't move the plan.
          </p>
        </div>
      </div>
    </div>
  );
}
