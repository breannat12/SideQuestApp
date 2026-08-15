import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DARK, LIGHT, MID, MINT, SKY, WHITE } from "../../constants/colors";
import { clockLabel } from "../../data/plans";
import type { ClockTime } from "../../data/plans";

/** Five-minute steps: fine enough to meet at 7:45, short enough to scroll. */
const MINUTE_STEP = 5;
const HOURS    = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES  = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
const MERIDIEM = ["AM", "PM"] as const;

/** Opens the picker on the next round slot rather than on a stale midnight. */
export function defaultClock(): ClockTime {
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
export function ClockPickerModal({
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
