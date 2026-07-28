import { Check, Clock, MapPin, X } from "lucide-react";
import { useState } from "react";
import { CARD, DARK, LAVENDER, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { LOCATION_SUGGESTIONS, TIME_SUGGESTIONS } from "../../data/activities";
import type { Plan } from "../../types";

export function SuggestSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [tab, setTab] = useState<"time" | "place">("time");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState("");
  const [sent, setSent] = useState(false);

  const canSend = tab === "time" ? !!selectedTime : !!selectedPlace;

  if (sent) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
        <div className="rounded-t-3xl flex flex-col items-center justify-center py-10 px-6 gap-4"
          style={{ background: WHITE }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: SKY + "20" }}>✉️</div>
          <h3 className="text-lg font-extrabold text-center" style={{ color: DARK }}>Suggestion Sent!</h3>
          <p className="text-sm text-center leading-relaxed" style={{ color: MID }}>
            {tab === "time"
              ? `You suggested changing the time to "${selectedTime}" for ${plan.activity}.`
              : `You suggested changing the place to "${selectedPlace}" for ${plan.activity}.`}
            <br />{plan.host} will be notified.
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
      <div className="rounded-t-3xl overflow-hidden flex flex-col" style={{ background: WHITE, maxHeight: "82%" }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: CARD }} />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div>
            <h3 className="text-lg font-extrabold" style={{ color: DARK }}>Suggest a Change</h3>
            <p className="text-xs mt-0.5" style={{ color: MID }}>
              for <span className="font-extrabold" style={{ color: DARK }}>{plan.emoji} {plan.activity}</span> by {plan.host}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
            style={{ background: CARD }}>
            <X size={14} style={{ color: MID }} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 px-5 pt-4 pb-3">
          {(["time", "place"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-extrabold transition-all"
              style={{
                background: tab === t ? DARK : CARD,
                color: tab === t ? WHITE : MID,
              }}>
              {t === "time" ? "🕐 New Time" : "📍 New Place"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5" style={{ scrollbarWidth: "none" }}>
          {/* Current value */}
          <div className="rounded-2xl p-3 mb-4 flex items-center gap-3"
            style={{ background: plan.accentColor + "14", border: `1.5px dashed ${plan.accentColor}50` }}>
            <span className="text-base">{tab === "time" ? "⏰" : "📍"}</span>
            <div>
              <p className="text-xs font-bold" style={{ color: MID }}>Current {tab}</p>
              <p className="text-sm font-extrabold" style={{ color: DARK }}>
                {tab === "time" ? plan.time : plan.location}
              </p>
            </div>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: plan.accentColor + "30", color: plan.accentColor }}>Now</span>
          </div>

          <p className="text-xs font-extrabold mb-2" style={{ color: MID }}>
            {tab === "time" ? "SUGGEST A TIME" : "SUGGEST A PLACE"}
          </p>

          {tab === "time" ? (
            <div className="flex flex-col gap-2 mb-4">
              {TIME_SUGGESTIONS.map((t) => (
                <button key={t} onClick={() => setSelectedTime(t)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                  style={{
                    background: selectedTime === t ? SKY + "18" : CARD,
                    border: selectedTime === t ? `2px solid ${SKY}` : "2px solid transparent",
                  }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: SKY + "20" }}>
                    <Clock size={15} style={{ color: SKY }} />
                  </div>
                  <span className="text-sm font-extrabold flex-1 text-left" style={{ color: DARK }}>{t}</span>
                  {selectedTime === t && <Check size={15} style={{ color: SKY }} />}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {LOCATION_SUGGESTIONS.map((l) => (
                <button key={l} onClick={() => setSelectedPlace(l)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                  style={{
                    background: selectedPlace === l ? MINT + "18" : CARD,
                    border: selectedPlace === l ? `2px solid ${MINT}` : "2px solid transparent",
                  }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: MINT + "20" }}>
                    <MapPin size={15} style={{ color: MINT }} />
                  </div>
                  <span className="text-sm font-extrabold flex-1 text-left" style={{ color: DARK }}>{l}</span>
                  {selectedPlace === l && <Check size={15} style={{ color: MINT }} />}
                </button>
              ))}
            </div>
          )}

          {/* Optional note */}
          <p className="text-xs font-extrabold mb-2" style={{ color: MID }}>ADD A NOTE (OPTIONAL)</p>
          <div className="rounded-2xl p-3 mb-1" style={{ background: CARD }}>
            <input
              className="w-full text-sm bg-transparent outline-none"
              style={{ color: DARK }}
              placeholder={`e.g. "The other spot has better parking…"`}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
          </div>
        </div>

        {/* Send button */}
        <div className="px-5 pb-6 pt-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button
            disabled={!canSend}
            onClick={() => canSend && setSent(true)}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white transition-all"
            style={{ background: canSend ? `linear-gradient(135deg, ${SKY}, ${LAVENDER})` : LIGHT }}>
            Send Suggestion to {plan.host.split(" ")[0]}
          </button>
        </div>
      </div>
    </div>
  );
}